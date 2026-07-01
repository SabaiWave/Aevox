-- Convert support_notes from text to jsonb append-log
-- Each entry: { ts: ISO-8601 string, note: string }
-- Existing text values are wrapped as a single backdated entry.
ALTER TABLE klipto.users
  ALTER COLUMN support_notes TYPE jsonb
  USING CASE
    WHEN support_notes IS NULL THEN NULL
    ELSE jsonb_build_array(
      jsonb_build_object('ts', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'note', support_notes)
    )
  END;
