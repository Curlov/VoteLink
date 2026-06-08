DO $$
DECLARE
  votes_created_at_type text;
BEGIN
  SELECT data_type
  INTO votes_created_at_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'votes'
    AND column_name = 'created_at';

  IF votes_created_at_type = 'timestamp without time zone' THEN
    ALTER TABLE votes
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';

    ALTER TABLE votes
      ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
