import { pool } from "../db/pool.js";

function cleanLimit(value, fallback) {
  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue < 1 ||
    numericValue > 10000
  ) {
    return fallback;
  }

  return numericValue;
}

export function getRateLimits() {
  return {
    pollsPerIpPerHour: cleanLimit(process.env.RATE_LIMIT_POLLS_PER_IP_HOUR, 5),
    votesPerIpPerMinute: cleanLimit(
      process.env.RATE_LIMIT_VOTES_PER_IP_MINUTE,
      30
    ),
    emailsPerAddressPerHour: cleanLimit(
      process.env.RATE_LIMIT_EMAILS_PER_ADDRESS_HOUR,
      3
    ),
  };
}

export async function consumeRateLimit({
  action,
  key,
  limit,
  windowSeconds,
}) {
  if (!key) {
    return {
      allowed: true,
      remaining: limit,
    };
  }

  const result = await pool.query(
    `
    WITH recent_events AS (
      SELECT COUNT(*)::int AS event_count
      FROM rate_limit_events
      WHERE action = $1
        AND rate_key = $2
        AND created_at > CURRENT_TIMESTAMP - ($4::int * interval '1 second')
    ),
    inserted_event AS (
      INSERT INTO rate_limit_events (action, rate_key)
      SELECT $1, $2
      FROM recent_events
      WHERE event_count < $3
      RETURNING id
    )
    SELECT
      recent_events.event_count,
      EXISTS(SELECT 1 FROM inserted_event) AS inserted
    FROM recent_events
    `,
    [action, key, limit, windowSeconds]
  );

  const row = result.rows[0];
  const usedBeforeCurrentRequest = row?.event_count || 0;
  const allowed = Boolean(row?.inserted);

  return {
    allowed,
    remaining: allowed
      ? Math.max(0, limit - usedBeforeCurrentRequest - 1)
      : 0,
  };
}
