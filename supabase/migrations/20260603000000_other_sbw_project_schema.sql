-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- Early access program: one invited user per code, unlimited paid briefs
create table if not exists early_access_users (
  id               uuid        primary key default gen_random_uuid(),
  user_id          text        not null unique,
  code_used        text        not null,
  redeemed_at      timestamptz not null default now(),
  briefs_generated integer     not null default 0,
  last_brief_at    timestamptz
);
alter table early_access_users enable row level security;
create policy "early_access_users_no_direct_access" on early_access_users using (false);
create index if not exists early_access_users_user_id on early_access_users(user_id);
create index if not exists early_access_users_code    on early_access_users(code_used);
-- Atomic increment (avoids read-modify-write race conditions)
create or replace function increment_early_access_usage(p_user_id text)
returns void language plpgsql security definer as $$
begin
  update early_access_users
  set briefs_generated = briefs_generated + 1,
      last_brief_at    = now()
  where user_id = p_user_id;
end;
$$
