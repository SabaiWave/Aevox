-- Add is_dry_run flag to pipeline_runs so dry runs are excluded from usage counts
ALTER TABLE klipto.pipeline_runs
  ADD COLUMN IF NOT EXISTS is_dry_run boolean NOT NULL DEFAULT false;
