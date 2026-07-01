ALTER TABLE klipto.users ADD COLUMN IF NOT EXISTS support_notes text;

-- Prevent authenticated users from updating their own support_notes via direct API calls.
-- Support notes are admin-only writes via service role key.
REVOKE UPDATE (support_notes) ON klipto.users FROM authenticated;
