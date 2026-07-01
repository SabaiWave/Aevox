-- Soft delete support for videos table
alter table klipto.videos add column if not exists deleted_at timestamptz default null;

-- RLS: users can only see their own non-deleted videos
-- (Existing SELECT policy already scopes to user_id; we filter deleted_at in app queries.
--  No RLS policy change needed — soft-deleted rows remain accessible to service role for audit.)
