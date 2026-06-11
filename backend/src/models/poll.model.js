import { pool } from "../db/pool.js";
import { FREE_POLL_VOTER_LIMIT } from "../utils/pollLimits.js";
import { hashToken, hashVoterToken } from "../utils/voterToken.js";

export async function expireActivePolls(db = pool) {
  const result = await db.query(
    `
    UPDATE polls
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at <= CURRENT_TIMESTAMP
    `
  );

  return result.rowCount;
}

export async function createPoll({
  publicId,
  adminToken,
  activationToken,
  title,
  description,
  creatorName,
  creatorEmail,
  creatorIp,
  isAnonymous,
  allowMultipleVotes,
  expiresAt,
  options,
}) {
  const client = await pool.connect();
  const adminTokenHash = hashToken(adminToken);
  const activationTokenHash = hashToken(activationToken);

  if (!adminTokenHash || !activationTokenHash) {
    return {
      success: false,
      status: 500,
      error: "Interner Fehler beim Erzeugen der Zugriffstoken.",
    };
  }

  try {
    await client.query("BEGIN");

    const ignoredCreatorResult = await client.query(
      `
      SELECT id
      FROM ignored_creator_emails
      WHERE email = $1
      `,
      [creatorEmail]
    );

    if (ignoredCreatorResult.rowCount > 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 403,
        error: "Mit dieser E-Mail-Adresse können keine Abstimmungen erstellt werden.",
      };
    }

    const pollResult = await client.query(
      `
      INSERT INTO polls (
        public_id,
        admin_token,
        title,
        description,
        creator_name,
        creator_email,
        creator_ip,
        creator_ip_expires_at,
        status,
        activation_token,
        activated_at,
        is_anonymous,
        allow_multiple_votes,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::inet, CURRENT_TIMESTAMP + interval '1 year', 'pending', $8, NULL, $9, $10, $11)
      RETURNING id, public_id, admin_token, activation_token, title, description, creator_name, creator_email, status, is_anonymous, allow_multiple_votes, created_at, expires_at
      `,
      [
        publicId,
        adminTokenHash,
        title,
        description || null,
        creatorName || null,
        creatorEmail,
        creatorIp || null,
        activationTokenHash,
        isAnonymous,
        allowMultipleVotes,
        expiresAt,
      ]
    );

    const poll = {
      ...pollResult.rows[0],
      admin_token: adminToken,
      activation_token: activationToken,
    };

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

    return {
      success: true,
      poll,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPollByPublicId(publicId) {
  await expireActivePolls();

  const pollResult = await pool.query(
    `
    SELECT 
      id,
      public_id,
      title,
      description,
      creator_name,
      creator_email,
      status,
      is_anonymous,
      allow_multiple_votes,
      created_at,
      expires_at
    FROM polls
    WHERE public_id = $1
      AND status IN ('active', 'expired')
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
    status: poll.status,
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

export async function getParticipationByPublicId({ publicId, voterToken }) {
  const voterTokenHash = hashVoterToken(voterToken);

  if (!voterTokenHash) {
    return {
      success: false,
      status: 400,
      error: "Teilnahme-Token fehlt oder ist ungültig.",
    };
  }

  const result = await pool.query(
    `
    SELECT pp.id
    FROM polls p
    LEFT JOIN poll_participations pp
      ON pp.poll_id = p.id
      AND pp.voter_token_hash = $2
    WHERE p.public_id = $1
    `,
    [publicId, voterTokenHash]
  );

  const row = result.rows[0];

  if (!row) {
    return {
      success: false,
      status: 404,
      error: "Abstimmung wurde nicht gefunden.",
    };
  }

  return {
    success: true,
    hasVoted: Boolean(row.id),
  };
}

export async function createVote({ publicId, optionIds, voterName, voterToken }) {
  const client = await pool.connect();
  const voterTokenHash = hashVoterToken(voterToken);

  if (!voterTokenHash) {
    return {
      success: false,
      status: 400,
      error: "Teilnahme-Token fehlt oder ist ungültig.",
    };
  }

  try {
    await client.query("BEGIN");

    const pollResult = await client.query(
      `
      SELECT 
      id,
      is_anonymous,
      allow_multiple_votes,
      status,
      expires_at
      FROM polls
      WHERE public_id = $1
      FOR UPDATE
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
      if (poll.status === "active") {
        await client.query(
          `
          UPDATE polls
          SET status = 'expired'
          WHERE id = $1
          `,
          [poll.id]
        );
      }

      await client.query("COMMIT");
      return {
        success: false,
        status: 403,
        error: "Diese Abstimmung ist bereits abgelaufen.",
      };
    }

    if (poll.status !== "active") {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 403,
        error: "Diese Abstimmung ist nicht aktiv.",
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

    const existingParticipationResult = await client.query(
      `
      SELECT id
      FROM poll_participations
      WHERE poll_id = $1
      AND voter_token_hash = $2
      `,
      [poll.id, voterTokenHash]
    );

    if (existingParticipationResult.rowCount > 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 409,
        error: "Sie haben Ihre Stimme bereits abgegeben.",
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

    const participationCountResult = await client.query(
      `
      SELECT COUNT(*)::int AS participant_count
      FROM poll_participations
      WHERE poll_id = $1
      `,
      [poll.id]
    );
    const participantCount =
      participationCountResult.rows[0]?.participant_count || 0;

    if (participantCount >= FREE_POLL_VOTER_LIMIT) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 403,
        error: `Diese kostenlose Abstimmung hat das Teilnehmerlimit von ${FREE_POLL_VOTER_LIMIT} erreicht und nimmt keine Antworten mehr entgegen.`,
      };
    }

    await client.query(
      `
      INSERT INTO poll_participations (
        poll_id,
        voter_token_hash
      )
      VALUES ($1, $2)
      RETURNING id
      `,
      [poll.id, voterTokenHash]
    );

    const votes = [];

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
          voterTokenHash,
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

async function buildPollResults(
  poll,
  { includeVoterNames = false, includeCreatorEmail = false } = {}
) {
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

  const results = {
    publicId: poll.public_id,
    title: poll.title,
    description: poll.description,
    creatorName: poll.creator_name,
    status: poll.status,
    isAnonymous: poll.is_anonymous,
    allowMultipleVotes: poll.allow_multiple_votes,
    createdAt: poll.created_at,
    expiresAt: poll.expires_at,
    totalVotes,
    totalVoters,
    maxVoters: FREE_POLL_VOTER_LIMIT,
    isParticipantLimitReached: totalVoters >= FREE_POLL_VOTER_LIMIT,
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

  if (includeCreatorEmail) {
    results.creatorEmail = poll.creator_email;
  }

  return results;
}

export async function getPollResultsByPublicId(publicId) {
  await expireActivePolls();

  const pollResult = await pool.query(
    `
    SELECT
      id,
      public_id,
      title,
      description,
      status,
      is_anonymous,
      allow_multiple_votes,
      created_at,
      expires_at
    FROM polls
    WHERE public_id = $1
      AND status IN ('active', 'expired')
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
  const adminTokenHash = hashToken(adminToken);

  if (!adminTokenHash) {
    return null;
  }

  await expireActivePolls();

  const pollResult = await pool.query(
    `
    SELECT
      id,
      public_id,
      title,
      description,
      creator_name,
      creator_email,
      status,
      is_anonymous,
      allow_multiple_votes,
      created_at,
      expires_at
    FROM polls
    WHERE admin_token = $1
    `,
    [adminTokenHash]
  );

  const poll = pollResult.rows[0];

  if (!poll) {
    return null;
  }

  return buildPollResults(poll, {
    includeVoterNames: true,
    includeCreatorEmail: true,
  });
}

export async function updatePollAdminByToken(
  adminToken,
  { title, description }
) {
  const adminTokenHash = hashToken(adminToken);

  if (!adminTokenHash) {
    return null;
  }

  const updates = [];
  const values = [adminTokenHash];

  if (title !== undefined) {
    values.push(title);
    updates.push(`title = $${values.length}`);
  }

  if (description !== undefined) {
    values.push(description || null);
    updates.push(`description = $${values.length}`);
  }

  if (updates.length === 0) {
    return getPollAdminByToken(adminToken);
  }

  const updateResult = await pool.query(
    `
    UPDATE polls
    SET ${updates.join(", ")}
    WHERE admin_token = $1
    RETURNING id
    `,
    values
  );

  if (updateResult.rowCount === 0) {
    return null;
  }

  return getPollAdminByToken(adminToken);
}

export async function closePollAdminByToken(adminToken) {
  const adminTokenHash = hashToken(adminToken);

  if (!adminTokenHash) {
    return null;
  }

  const updateResult = await pool.query(
    `
    UPDATE polls
    SET expires_at = CURRENT_TIMESTAMP,
        status = 'expired'
    WHERE admin_token = $1
    RETURNING id
    `,
    [adminTokenHash]
  );

  if (updateResult.rowCount === 0) {
    return null;
  }

  return getPollAdminByToken(adminToken);
}

export async function extendPollAdminByToken(adminToken, durationDays) {
  const adminTokenHash = hashToken(adminToken);

  if (!adminTokenHash) {
    return null;
  }

  const updateResult = await pool.query(
    `
    UPDATE polls
    SET expires_at =
          GREATEST(COALESCE(expires_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
          + ($2::int * interval '1 day'),
        status = CASE WHEN status = 'expired' THEN 'active' ELSE status END
    WHERE admin_token = $1
    RETURNING id
    `,
    [adminTokenHash, durationDays]
  );

  if (updateResult.rowCount === 0) {
    return null;
  }

  return getPollAdminByToken(adminToken);
}

export async function deletePollAdminByToken(adminToken) {
  const client = await pool.connect();
  const adminTokenHash = hashToken(adminToken);

  if (!adminTokenHash) {
    return false;
  }

  try {
    await client.query("BEGIN");

    const pollResult = await client.query(
      `
      SELECT id
      FROM polls
      WHERE admin_token = $1
      `,
      [adminTokenHash]
    );

    const poll = pollResult.rows[0];

    if (!poll) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      `
      DELETE FROM votes
      WHERE poll_id = $1
      `,
      [poll.id]
    );
    await client.query(
      `
      DELETE FROM poll_options
      WHERE poll_id = $1
      `,
      [poll.id]
    );
    await client.query(
      `
      DELETE FROM polls
      WHERE id = $1
      `,
      [poll.id]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function activatePollByToken(activationToken) {
  const activationTokenHash = hashToken(activationToken);

  if (!activationTokenHash) {
    return null;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pollResult = await client.query(
      `
      SELECT public_id, title, status, expires_at
      FROM polls
      WHERE activation_token = $1
      FOR UPDATE
      `,
      [activationTokenHash]
    );

    const poll = pollResult.rows[0];

    if (!poll || !["pending", "active"].includes(poll.status)) {
      await client.query("ROLLBACK");
      return null;
    }

    if (poll.expires_at && new Date(poll.expires_at) <= new Date()) {
      await client.query(
        `
        UPDATE polls
        SET status = 'expired'
        WHERE activation_token = $1
        `,
        [activationTokenHash]
      );
      await client.query("COMMIT");
      return null;
    }

    if (poll.status === "pending") {
      await client.query(
        `
        UPDATE polls
        SET status = 'active',
            activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP)
        WHERE activation_token = $1
        `,
        [activationTokenHash]
      );
    }

    await client.query("COMMIT");

    return {
      publicId: poll.public_id,
      title: poll.title,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createPollReport({
  publicId,
  reporterEmail,
  reason,
  details,
  reporterIp,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pollResult = await client.query(
      `
      SELECT id
      FROM polls
      WHERE public_id = $1
      `,
      [publicId]
    );

    const poll = pollResult.rows[0];

    if (!poll) {
      await client.query("ROLLBACK");
      return null;
    }

    const rateLimitResult = await client.query(
      `
      SELECT COUNT(*)::int AS report_count
      FROM poll_reports
      WHERE created_at > CURRENT_TIMESTAMP - interval '1 hour'
        AND (
          ($1::inet IS NOT NULL AND reporter_ip = $1::inet)
          OR ($1::inet IS NULL AND reporter_email = $2)
        )
      `,
      [reporterIp || null, reporterEmail]
    );

    if ((rateLimitResult.rows[0]?.report_count || 0) >= 3) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 429,
        error: "Es sind maximal 3 Meldungen pro Stunde möglich.",
      };
    }

    const result = await client.query(
      `
      INSERT INTO poll_reports (
        poll_id,
        reporter_email,
        reason,
        details,
        reporter_ip
      )
      VALUES ($1, $2, $3, $4, $5::inet)
      RETURNING id, created_at
      `,
      [poll.id, reporterEmail, reason, details || null, reporterIp || null]
    );

    await client.query("COMMIT");

    const report = result.rows[0];

    return {
      success: true,
      report: {
        id: report.id,
        createdAt: report.created_at,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOperatorPolls() {
  await expireActivePolls();

  const result = await pool.query(
    `
    SELECT
      p.id,
      p.public_id,
      p.title,
      p.description,
      p.creator_name,
      p.creator_email,
      host(p.creator_ip) AS creator_ip,
      p.creator_ip_expires_at,
      p.status,
      p.created_at,
      p.activated_at,
      p.blocked_at,
      p.blocked_reason,
      p.expires_at,
      COUNT(DISTINCT po.id)::int AS option_count,
      COUNT(DISTINCT pp.id)::int AS participant_count,
      COUNT(DISTINCT pr.id)::int AS report_count,
      MAX(pr.created_at) AS last_reported_at,
      COALESCE(
        (
          SELECT json_agg(report_data ORDER BY report_data.created_at DESC)
          FROM (
            SELECT
              prd.id,
              prd.reporter_email,
              prd.reason,
              prd.details,
              host(prd.reporter_ip) AS reporter_ip,
              prd.created_at
            FROM poll_reports prd
            WHERE prd.poll_id = p.id
            ORDER BY prd.created_at DESC
            LIMIT 10
          ) report_data
        ),
        '[]'::json
      ) AS reports
    FROM polls p
    LEFT JOIN poll_options po ON po.poll_id = p.id
    LEFT JOIN poll_participations pp ON pp.poll_id = p.id
    LEFT JOIN poll_reports pr ON pr.poll_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 250
    `
  );

  return result.rows.map((poll) => ({
    publicId: poll.public_id,
    title: poll.title,
    description: poll.description,
    creatorName: poll.creator_name,
    creatorEmail: poll.creator_email,
    creatorIp: poll.creator_ip,
    creatorIpExpiresAt: poll.creator_ip_expires_at,
    status: poll.status,
    createdAt: poll.created_at,
    activatedAt: poll.activated_at,
    blockedAt: poll.blocked_at,
    blockedReason: poll.blocked_reason,
    expiresAt: poll.expires_at,
    optionCount: poll.option_count,
    participantCount: poll.participant_count,
    reportCount: poll.report_count,
    lastReportedAt: poll.last_reported_at,
    reports: poll.reports.map((report) => ({
      id: report.id,
      reporterEmail: report.reporter_email,
      reason: report.reason,
      details: report.details,
      reporterIp: report.reporter_ip,
      createdAt: report.created_at,
    })),
  }));
}

export async function listIgnoredCreatorEmails() {
  const result = await pool.query(
    `
    SELECT email, reason, created_at
    FROM ignored_creator_emails
    ORDER BY created_at DESC
    LIMIT 250
    `
  );

  return result.rows.map((entry) => ({
    email: entry.email,
    reason: entry.reason,
    createdAt: entry.created_at,
  }));
}

export async function addIgnoredCreatorEmail({ email, reason }) {
  const result = await pool.query(
    `
    INSERT INTO ignored_creator_emails (email, reason)
    VALUES ($1, $2)
    ON CONFLICT (email)
    DO UPDATE SET reason = EXCLUDED.reason
    RETURNING email, reason, created_at
    `,
    [email, reason || null]
  );

  const entry = result.rows[0];

  return {
    email: entry.email,
    reason: entry.reason,
    createdAt: entry.created_at,
  };
}

export async function removeIgnoredCreatorEmail(email) {
  const result = await pool.query(
    `
    DELETE FROM ignored_creator_emails
    WHERE email = $1
    `,
    [email]
  );

  return result.rowCount > 0;
}

export async function updateOperatorPollStatus({ publicId, status, reason }) {
  const allowedStatuses = new Set(["active", "blocked", "disabled"]);

  if (!allowedStatuses.has(status)) {
    return null;
  }

  const result = await pool.query(
    `
    UPDATE polls
    SET status = $2,
        blocked_at = CASE WHEN $2 = 'blocked' THEN CURRENT_TIMESTAMP ELSE NULL END,
        blocked_reason = CASE WHEN $2 = 'blocked' THEN $3 ELSE NULL END
    WHERE public_id = $1
    RETURNING public_id
    `,
    [publicId, status, reason || null]
  );

  return result.rowCount > 0;
}

export async function deletePollOperatorByPublicId(publicId) {
  const result = await pool.query(
    `
    DELETE FROM polls
    WHERE public_id = $1
    `,
    [publicId]
  );

  return result.rowCount > 0;
}
