import { pool } from "./pool.js";
import { cleanRetentionDays } from "../utils/retention.js";

export async function cleanupExpiredPolls(retentionDaysInput) {
  const retentionDays = cleanRetentionDays(retentionDaysInput);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const expiredCreatorIpsResult = await client.query(
      `
      UPDATE polls
      SET creator_ip = NULL
      WHERE creator_ip IS NOT NULL
        AND creator_ip_expires_at <= CURRENT_TIMESTAMP
      `
    );
    const expiredRateLimitEventsResult = await client.query(
      `
      DELETE FROM rate_limit_events
      WHERE created_at < CURRENT_TIMESTAMP - interval '2 days'
      `
    );

    const expiredPollsResult = await client.query(
      `
      SELECT id
      FROM polls
      WHERE expires_at IS NOT NULL
        AND expires_at < CURRENT_TIMESTAMP - ($1::int * interval '1 day')
      `,
      [retentionDays]
    );
    const pollIds = expiredPollsResult.rows.map((poll) => poll.id);

    if (pollIds.length === 0) {
      await client.query("COMMIT");
      return {
        deletedPolls: 0,
        clearedCreatorIps: expiredCreatorIpsResult.rowCount,
        deletedRateLimitEvents: expiredRateLimitEventsResult.rowCount,
        retentionDays,
      };
    }

    await client.query(
      `
      DELETE FROM poll_participations
      WHERE poll_id = ANY($1::int[])
      `,
      [pollIds]
    );
    await client.query(
      `
      DELETE FROM votes
      WHERE poll_id = ANY($1::int[])
      `,
      [pollIds]
    );
    await client.query(
      `
      DELETE FROM poll_options
      WHERE poll_id = ANY($1::int[])
      `,
      [pollIds]
    );
    await client.query(
      `
      DELETE FROM polls
      WHERE id = ANY($1::int[])
      `,
      [pollIds]
    );

    await client.query("COMMIT");

    return {
      deletedPolls: pollIds.length,
      clearedCreatorIps: expiredCreatorIpsResult.rowCount,
      deletedRateLimitEvents: expiredRateLimitEventsResult.rowCount,
      retentionDays,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await cleanupExpiredPolls(
      process.env.FREE_POLL_RETENTION_DAYS
    );

    console.log(
      `Gelöschte abgelaufene Abstimmungen: ${result.deletedPolls} ` +
        `(Aufbewahrung: ${result.retentionDays} Tage nach Ablauf), ` +
        `gelöschte Ersteller-IPs: ${result.clearedCreatorIps}, ` +
        `gelöschte Rate-Limit-Events: ${result.deletedRateLimitEvents}`
    );
  } catch (error) {
    console.error("Cleanup fehlgeschlagen:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
