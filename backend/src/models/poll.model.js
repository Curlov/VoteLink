import { pool } from "../db/pool.js";

export async function createPoll({
  publicId,
  adminToken,
  title,
  description,
  isAnonymous,
  allowMultipleVotes,
  options,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pollResult = await client.query(
      `
      INSERT INTO polls (
        public_id,
        admin_token,
        title,
        description,
        is_anonymous,
        allow_multiple_votes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, public_id, admin_token, title, description, is_anonymous, allow_multiple_votes, created_at
      `,
      [
        publicId,
        adminToken,
        title,
        description || null,
        isAnonymous,
        allowMultipleVotes,
      ]
    );

    const poll = pollResult.rows[0];

    for (let i = 0; i < options.length; i++) {
      await client.query(
        `
        INSERT INTO poll_options (poll_id, option_text, position)
        VALUES ($1, $2, $3)
        `,
        [poll.id, options[i], i]
      );
    }

    await client.query("COMMIT");

    return poll;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPollByPublicId(publicId) {
  const pollResult = await pool.query(
    `
    SELECT 
      id,
      public_id,
      title,
      description,
      is_anonymous,
      allow_multiple_votes,
      created_at,
      expires_at
    FROM polls
    WHERE public_id = $1
    `,
    [publicId]
  );

  const poll = pollResult.rows[0];

  if (!poll) {
    return null;
  }

  const optionsResult = await pool.query(
    `
    SELECT 
      id,
      option_text,
      position
    FROM poll_options
    WHERE poll_id = $1
    ORDER BY position ASC
    `,
    [poll.id]
  );

  return {
    id: poll.id,
    publicId: poll.public_id,
    title: poll.title,
    description: poll.description,
    isAnonymous: poll.is_anonymous,
    allowMultipleVotes: poll.allow_multiple_votes,
    createdAt: poll.created_at,
    expiresAt: poll.expires_at,
    options: optionsResult.rows.map((option) => ({
      id: option.id,
      text: option.option_text,
      position: option.position,
    })),
  };
}

export async function createVote({ publicId, optionId, voterName }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pollResult = await client.query(
      `
      SELECT 
        id,
        is_anonymous
      FROM polls
      WHERE public_id = $1
      `,
      [publicId]
    );

    const poll = pollResult.rows[0];

    if (!poll) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 404,
        error: "Abstimmung wurde nicht gefunden.",
      };
    }

    const optionResult = await client.query(
      `
      SELECT id
      FROM poll_options
      WHERE id = $1
      AND poll_id = $2
      `,
      [optionId, poll.id]
    );

    const option = optionResult.rows[0];

    if (!option) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 400,
        error: "Die gewählte Option gehört nicht zu dieser Abstimmung.",
      };
    }

    if (!poll.is_anonymous && (!voterName || voterName.trim().length < 2)) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 400,
        error: "Für diese Abstimmung muss ein Name angegeben werden.",
      };
    }

    const voteResult = await client.query(
      `
      INSERT INTO votes (
        poll_id,
        option_id,
        voter_name
      )
      VALUES ($1, $2, $3)
      RETURNING id, created_at
      `,
      [
        poll.id,
        option.id,
        poll.is_anonymous ? null : voterName.trim(),
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      vote: voteResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPollResultsByPublicId(publicId) {
  const pollResult = await pool.query(
    `
    SELECT
      id,
      public_id,
      title,
      description,
      is_anonymous,
      allow_multiple_votes,
      created_at,
      expires_at
    FROM polls
    WHERE public_id = $1
    `,
    [publicId]
  );

  const poll = pollResult.rows[0];

  if (!poll) {
    return null;
  }

  const resultsResult = await pool.query(
    `
    SELECT
      po.id,
      po.option_text,
      po.position,
      COUNT(v.id)::int AS vote_count
    FROM poll_options po
    LEFT JOIN votes v
      ON v.option_id = po.id
    WHERE po.poll_id = $1
    GROUP BY po.id, po.option_text, po.position
    ORDER BY po.position ASC
    `,
    [poll.id]
  );

  const totalVotesResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total_votes
    FROM votes
    WHERE poll_id = $1
    `,
    [poll.id]
  );

  const totalVotes = totalVotesResult.rows[0].total_votes;

  return {
    publicId: poll.public_id,
    title: poll.title,
    description: poll.description,
    isAnonymous: poll.is_anonymous,
    allowMultipleVotes: poll.allow_multiple_votes,
    createdAt: poll.created_at,
    expiresAt: poll.expires_at,
    totalVotes,
    options: resultsResult.rows.map((option) => ({
      id: option.id,
      text: option.option_text,
      position: option.position,
      voteCount: option.vote_count,
      percentage:
        totalVotes === 0
          ? 0
          : Math.round((option.vote_count / totalVotes) * 100),
    })),
  };
}
