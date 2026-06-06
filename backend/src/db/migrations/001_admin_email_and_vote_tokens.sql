ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS creator_name text;

ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS creator_email text;

ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE polls
SET creator_email = 'unknown@example.com'
WHERE creator_email IS NULL;

ALTER TABLE polls
  ALTER COLUMN creator_email SET NOT NULL;

ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS voter_token text;
