-- Migration owned by another SBW project. Stored here to keep CLI history in sync.
-- DO NOT modify or remove.

-- Add Stripe paywall support to briefs table
-- Phase 6: stripe_session_id + payment_status columns
-- Also relax NOT NULL constraints so a shell record can be inserted at checkout time
-- (brief content columns are populated by the webhook after payment completes)

alter table briefs
  add column if not exists stripe_session_id text,
  add column if not exists payment_status    text not null default 'unpaid';
-- Relax NOT NULL so checkout can insert a shell record before pipeline runs
alter table briefs alter column brief_markdown     drop not null;
alter table briefs alter column conflict_report    drop not null;
alter table briefs alter column agent_statuses     drop not null;
alter table briefs alter column overall_confidence drop not null;
alter table briefs alter column visa_request       drop not null
