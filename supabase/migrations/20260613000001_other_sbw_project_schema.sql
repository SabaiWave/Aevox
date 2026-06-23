-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- service_role needs SELECT on all visascout tables.
-- saveBrief uses .insert().select('id') which requires SELECT for the RETURNING clause.
-- poll/route and admin routes also do direct .select() queries as service_role.

grant select on visascout.briefs             to service_role;
grant select on visascout.brief_jobs         to service_role;
grant select on visascout.free_brief_daily   to service_role;
grant select on visascout.ip_abuse_log       to service_role;
grant select on visascout.early_access_users to service_role
