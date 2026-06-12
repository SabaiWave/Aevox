-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- SECURITY DEFINER function for inserting briefs.
-- Runs as the table owner (postgres) regardless of the calling role,
-- bypassing grant and RLS issues with the new Supabase key format.
create or replace function insert_brief(p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into briefs (
    nationality,
    destination,
    visa_type,
    freeform_input,
    visa_request,
    brief_markdown,
    conflict_report,
    agent_statuses,
    overall_confidence,
    degraded,
    depth,
    user_id
  ) values (
    p_data->>'nationality',
    p_data->>'destination',
    nullif(p_data->>'visa_type', ''),
    nullif(p_data->>'freeform_input', ''),
    p_data->'visa_request',
    p_data->>'brief_markdown',
    p_data->'conflict_report',
    p_data->'agent_statuses',
    p_data->>'overall_confidence',
    (p_data->>'degraded')::boolean,
    p_data->>'depth',
    nullif(p_data->>'user_id', '')
  )
  returning id into v_id;

  return v_id;
end;
$$;
-- Allow all roles to call the function
grant execute on function insert_brief(jsonb) to anon, authenticated, service_role
