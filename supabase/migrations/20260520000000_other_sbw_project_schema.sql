-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- Add soft delete support to briefs
alter table briefs add column if not exists deleted_at timestamptz;
-- Update public read policy to exclude soft-deleted briefs
drop policy if exists "briefs_public_read_by_id" on briefs;
create policy "briefs_public_read_by_id"
  on briefs for select
  using (deleted_at is null)
