-- Add chars_used to track ElevenLabs character consumption per run
ALTER TABLE klipto.videos ADD COLUMN IF NOT EXISTS chars_used integer NOT NULL DEFAULT 0;

-- Add is_simulated to mark quota-sim test rows for easy cleanup
ALTER TABLE klipto.videos ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false;

-- Make config_id nullable so quota-sim can insert rows without a real config
ALTER TABLE klipto.videos ALTER COLUMN config_id DROP NOT NULL;

-- Migrate existing voice chars from usage_logs into videos.chars_used
UPDATE klipto.videos v
SET chars_used = sub.total
FROM (
  SELECT run_id, SUM(chars_used) AS total
  FROM klipto.usage_logs
  WHERE event_type = 'voice_chars_used'
  GROUP BY run_id
) sub
WHERE v.id = sub.run_id;

-- Drop usage_logs — all quota tracking now lives on the videos row
DROP TABLE IF EXISTS klipto.usage_logs;
