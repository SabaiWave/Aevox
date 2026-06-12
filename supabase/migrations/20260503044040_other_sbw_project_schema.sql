-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- briefs: persisted VisaBrief output per generation
create table if not exists briefs (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  nationality         text not null,
  destination         text not null,
  visa_type           text,
  freeform_input      text,
  visa_request        jsonb not null,
  brief_markdown      text not null,
  conflict_report     jsonb not null,
  agent_statuses      jsonb not null,
  overall_confidence  text not null,
  degraded            boolean not null default false,
  depth               text not null,
  user_id             text
);
-- RLS: enable row-level security
alter table briefs enable row level security;
-- Public read by id (any caller can view a brief if they have the id)
create policy "briefs_public_read_by_id"
  on briefs for select
  using (true);
-- Write only via service role (no direct client inserts)
-- Service role bypasses RLS by default; these policies block anon/authenticated writes
create policy "briefs_insert_service_role_only"
  on briefs for insert
  with check (false);
create policy "briefs_update_service_role_only"
  on briefs for update
  using (false);
create policy "briefs_delete_service_role_only"
  on briefs for delete
  using (false)
