UPDATE polls
SET status = 'expired'
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at <= CURRENT_TIMESTAMP;
