-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- Phase 9: cost tracking, background job queue, free tier enforcement, IP abuse log

-- Cost tracking columns on briefs table
alter table briefs
  add column if not exists total_tokens_input   integer,
  add column if not exists total_tokens_output  integer,
  add column if not exists tavily_searches      integer,
  add column if not exists estimated_cost_usd   numeric(10, 6);
-- brief_jobs: Stripe webhook queues here; cron processor runs the pipeline
-- Returning 200 to Stripe immediately prevents retries from double-running the pipeline.
create table if not exists brief_jobs (
  id           uuid primary key default gen_random_uuid(),
  brief_id     uuid not null references briefs(id),
  status       text not null default 'pending', -- pending | processing | done | failed
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz,
  error        text,
  constraint brief_jobs_brief_id_unique unique (brief_id)
);
alter table brief_jobs enable row level security;
create policy "brief_jobs_no_direct_access" on brief_jobs using (false);
-- free_brief_daily: one Quick brief per userId per calendar day
create table if not exists free_brief_daily (
  user_id text not null,
  date    date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, date)
);
alter table free_brief_daily enable row level security;
create policy "free_brief_daily_no_direct_access" on free_brief_daily using (false);
-- ip_abuse_log: soft flag only — no hard blocks (shared IPs penalise legitimate users)
create table if not exists ip_abuse_log (
  id         uuid primary key default gen_random_uuid(),
  ip         text not null,
  user_id    text,
  created_at timestamptz not null default now(),
  reason     text
);
alter table ip_abuse_log enable row level security;
create policy "ip_abuse_log_no_direct_access" on ip_abuse_log using (false);
-- Atomic upsert-increment for daily cap (avoids race conditions)
create or replace function increment_free_daily_count(p_user_id text, p_date date)
returns void language plpgsql security definer as $$
begin
  insert into free_brief_daily (user_id, date, count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set count = free_brief_daily.count + 1;
end;
$$;
-- Indices
create index if not exists free_brief_daily_user_date on free_brief_daily(user_id, date);
create index if not exists ip_abuse_log_ip            on ip_abuse_log(ip);
create index if not exists ip_abuse_log_created       on ip_abuse_log(created_at desc);
create index if not exists brief_jobs_status          on brief_jobs(status) where status = 'pending'
