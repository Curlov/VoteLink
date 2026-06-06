import { pool } from "../db/pool.js";
import { nanoid } from "nanoid";

export async function createPoll({
  publicId,
  adminToken,
  title,
  description,
  creatorName,
  creatorEmail,
  isAnonymous,
  allowMultipleVotes,
  expiresAt,
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
        creator_name,
        creator_email,
        is_anonymous,
        allow_multiple_votes,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, public_id, admin_token, title, description, creator_name, creator_email, is_anonymous, allow_multiple_votes, created_at, expires_at
      `,
      [
        publicId,
        adminToken,
        title,
        description || null,
        creatorName || null,
        creatorEmail,
        isAnonymous,
        allowMultipleVotes,
        expiresAt,
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
      creator_name,
      creator_email,
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
    creatorName: poll.creator_name,
    creatorEmail: poll.creator_email,
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

export async function createVote({ publicId, optionIds, voterName }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pollResult = await client.query(
      `
      SELECT 
        id,
        is_anonymous,
        allow_multiple_votes,
        expires_at
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

    if (poll.expires_at && new Date(poll.expires_at) <= new Date()) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 403,
        error: "Diese Abstimmung ist bereits abgelaufen.",
      };
    }

    if (!poll.allow_multiple_votes && optionIds.length > 1) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 400,
        error: "Für diese Abstimmung darf nur eine Option gewählt werden.",
      };
    }

    const optionResult = await client.query(
      `
      SELECT id
      FROM poll_options
      WHERE poll_id = $1
      AND id = ANY($2::int[])
      ORDER BY position ASC
      `,
      [poll.id, optionIds]
    );

    if (optionResult.rows.length !== optionIds.length) {
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

    const votes = [];
    const voterToken = nanoid(32);

    for (const option of optionResult.rows) {
      const voteResult = await client.query(
        `
        INSERT INTO votes (
          poll_id,
          option_id,
          voter_name,
          voter_token
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
        `,
        [
          poll.id,
          option.id,
          poll.is_anonymous ? null : voterName.trim(),
          voterToken,
        ]
      );

      votes.push(voteResult.rows[0]);
    }

    await client.query("COMMIT");

    return {
      success: true,
      votes,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function buildPollResults(poll, { includeVoterNames = false } = {}) {
  const resultsResult = await pool.query(
    `
    SELECT
      po.id,
      po.option_text,
      po.position,
      COUNT(v.id)::int AS vote_count,
      COALESCE(
        ARRAY_AGG(v.voter_name ORDER BY v.created_at)
          FILTER (WHERE v.voter_name IS NOT NULL),
        ARRAY[]::text[]
      ) AS voter_names
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
    SELECT
      COUNT(*)::int AS total_votes,
      (
        COUNT(DISTINCT voter_token) FILTER (WHERE voter_token IS NOT NULL)
        + COUNT(*) FILTER (WHERE voter_token IS NULL)
      )::int AS total_voters
    FROM votes
    WHERE poll_id = $1
    `,
    [poll.id]
  );

  const totalVotes = totalVotesResult.rows[0].total_votes;
  const totalVoters = totalVotesResult.rows[0].total_voters;

  return {
    publicId: poll.public_id,
    title: poll.title,
    description: poll.description,
    creatorName: poll.creator_name,
    creatorEmail: poll.creator_email,
    isAnonymous: poll.is_anonymous,
    allowMultipleVotes: poll.allow_multiple_votes,
    createdAt: poll.created_at,
    expiresAt: poll.expires_at,
    totalVotes,
    totalVoters,
    options: resultsResult.rows.map((option) => ({
      id: option.id,
      text: option.option_text,
      position: option.position,
      voteCount: option.vote_count,
      voterNames:
        includeVoterNames && !poll.is_anonymous ? option.voter_names : [],
      percentage:
        totalVotes === 0
          ? 0
          : Math.round((option.vote_count / totalVotes) * 100),
    })),
  };
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

  return buildPollResults(poll);
}

export async function getPollAdminByToken(adminToken) {
  const pollResult = await pool.query(
    `
    SELECT
      id,
      public_id,
      title,
      description,
      creator_name,
      creator_email,
      is_anonymous,
      allow_multiple_votes,
      created_at,
      expires_at
    FROM polls
    WHERE admin_token = $1
    `,
    [adminToken]
  );

  const poll = pollResult.rows[0];

  if (!poll) {
    return null;
  }

  return buildPollResults(poll, { includeVoterNames: true });
}
