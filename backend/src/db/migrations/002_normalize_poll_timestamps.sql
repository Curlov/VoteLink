DO $$
DECLARE
  created_at_type text;
  expires_at_type text;
BEGIN
  SELECT data_type
  INTO created_at_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'polls'
    AND column_name = 'created_at';

  IF created_at_type = 'timestamp without time zone' THEN
    ALTER TABLE polls
      ALTER COLUMN created_at TYPE timestamptz
      USING CASE
        WHEN expires_at IS NOT NULL
          AND (
            abs(extract(epoch FROM ((expires_at - created_at) - interval '1 day'))) < 600
            OR abs(extract(epoch FROM ((expires_at - created_at) - interval '7 days'))) < 600
            OR abs(extract(epoch FROM ((expires_at - created_at) - interval '14 days'))) < 600
            OR abs(extract(epoch FROM ((expires_at - created_at) - interval '28 days'))) < 600
          )
          THEN created_at AT TIME ZONE 'Europe/Berlin'
        ELSE created_at AT TIME ZONE 'UTC'
      END;

    ALTER TABLE polls
      ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
  END IF;

  SELECT data_type
  INTO expires_at_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'polls'
    AND column_name = 'expires_at';

  IF expires_at_type = 'timestamp without time zone' THEN
    ALTER TABLE polls
      ALTER COLUMN expires_at TYPE timestamptz
      USING expires_at AT TIME ZONE 'Europe/Berlin';
  END IF;

  UPDATE polls
  SET created_at = created_at - interval '2 hours'
  WHERE expires_at IS NOT NULL
    AND (
      abs(extract(epoch FROM ((expires_at - created_at) - (interval '1 day' - interval '2 hours')))) < 600
      OR abs(extract(epoch FROM ((expires_at - created_at) - (interval '7 days' - interval '2 hours')))) < 600
      OR abs(extract(epoch FROM ((expires_at - created_at) - (interval '14 days' - interval '2 hours')))) < 600
      OR abs(extract(epoch FROM ((expires_at - created_at) - (interval '28 days' - interval '2 hours')))) < 600
    );
END $$;
