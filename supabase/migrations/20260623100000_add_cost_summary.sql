ALTER TABLE klipto.pipeline_runs
  ADD COLUMN IF NOT EXISTS cost_summary jsonb;
