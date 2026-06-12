-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- Explicit grants needed because "Automatically expose new tables and functions"
-- was disabled during project creation. Without this, all roles get permission denied.

grant usage on schema public to anon, authenticated, service_role;
-- anon and authenticated can read briefs by id (shareable links)
grant select on briefs to anon, authenticated;
-- service_role can write (insert via server-side saveBrief)
grant insert, update, delete on briefs to service_role
