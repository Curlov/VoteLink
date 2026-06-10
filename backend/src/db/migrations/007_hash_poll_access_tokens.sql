CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE polls
SET admin_token = encode(digest(admin_token, 'sha256'), 'hex')
WHERE admin_token IS NOT NULL
  AND admin_token !~ '^[0-9a-f]{64}$';

UPDATE polls
SET activation_token = encode(digest(activation_token, 'sha256'), 'hex')
WHERE activation_token IS NOT NULL
  AND activation_token !~ '^[0-9a-f]{64}$';
