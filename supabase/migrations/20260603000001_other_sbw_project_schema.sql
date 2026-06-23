-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- Soft revocation: set revoked_at instead of deleting rows so codes stay permanently consumed
alter table early_access_users add column if not exists revoked_at timestamptz
