-- Migration: aevox schema — 2026-06-13
-- Creates the dedicated `aevox` Postgres schema on the shared Supabase instance.
-- This is the combined final state of:
--   20260611000000_initial_schema.sql
--   20260613000000_rls_user_ownership.sql
-- All tables are schema-qualified to `aevox` instead of `public`.
--
-- Auth model: Clerk v7 JWTs accepted by Supabase.
--   auth.jwt() ->> 'sub'  returns the Clerk userId (text).
--   aevox.users.clerk_id  maps Clerk userId to internal uuid (users.id).
--   aevox.users.id        is the FK used in all other tables.
--
-- Server-side API routes use the service role key and bypass RLS entirely.
-- RLS policies gate the anon/authenticated browser client only.

-- ---------------------------------------------------------------------------
-- Schema + grants
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS aevox;

GRANT USAGE ON SCHEMA aevox TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. aevox.users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aevox.users (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id   text        UNIQUE NOT NULL,
  email      text        NOT NULL,
  tier       text        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE aevox.users ENABLE ROW LEVEL SECURITY;

-- SELECT: own row only.
CREATE POLICY "users_select_own" ON aevox.users
  FOR SELECT
  USING (clerk_id = (auth.jwt() ->> 'sub'));

-- UPDATE: own row only.
CREATE POLICY "users_update_own" ON aevox.users
  FOR UPDATE
  USING (clerk_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

-- INSERT: intentionally omitted.
-- User creation is handled server-side via Clerk webhook using the service role key.

GRANT SELECT, INSERT, UPDATE                    ON aevox.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE            ON aevox.users TO service_role;

-- ---------------------------------------------------------------------------
-- 2. aevox.channel_configs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aevox.channel_configs (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES aevox.users(id) ON DELETE CASCADE,
  name                    text        NOT NULL,
  niche                   text        NOT NULL,
  tone                    text        NOT NULL,
  script_structure        text        NOT NULL DEFAULT 'hook-story-lesson-cta',
  target_duration_min     int         NOT NULL DEFAULT 8,
  forbidden_topics        text[]      NOT NULL DEFAULT '{}',
  voice_id                text        NOT NULL,
  voice_model             text        NOT NULL DEFAULT 'eleven_multilingual_v2',
  yt_title_template       text        NOT NULL DEFAULT '{topic} | {channel}',
  yt_description_template text        NOT NULL DEFAULT '',
  yt_tags                 text[]      NOT NULL DEFAULT '{}',
  yt_category_id          text        NOT NULL DEFAULT '22',
  yt_privacy              text        NOT NULL DEFAULT 'private',  -- 'private' | 'unlisted' | 'public'
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE aevox.channel_configs ENABLE ROW LEVEL SECURITY;

-- SELECT: rows belonging to the authenticated user.
CREATE POLICY "channel_configs_select_own" ON aevox.channel_configs
  FOR SELECT
  USING (
    user_id = (SELECT id FROM aevox.users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- INSERT: only allowed if inserting under own user_id.
CREATE POLICY "channel_configs_insert_own" ON aevox.channel_configs
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM aevox.users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- UPDATE: own rows only.
CREATE POLICY "channel_configs_update_own" ON aevox.channel_configs
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM aevox.users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  )
  WITH CHECK (
    user_id = (SELECT id FROM aevox.users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- DELETE: intentionally omitted.
-- Soft deletes not implemented; hard deletes not permitted via client.

GRANT SELECT, INSERT, UPDATE                    ON aevox.channel_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE            ON aevox.channel_configs TO service_role;

CREATE INDEX IF NOT EXISTS idx_channel_configs_user_id ON aevox.channel_configs(user_id);

-- ---------------------------------------------------------------------------
-- 3. aevox.pipeline_runs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aevox.pipeline_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES aevox.users(id) ON DELETE CASCADE,
  config_id       uuid        REFERENCES aevox.channel_configs(id) ON DELETE SET NULL,
  topic           text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'complete' | 'failed'
  research_result jsonb,
  script_result   jsonb,
  voice_result    jsonb,
  publish_result  jsonb,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE aevox.pipeline_runs ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows only.
CREATE POLICY "pipeline_runs_select_own" ON aevox.pipeline_runs
  FOR SELECT
  USING (
    user_id = (SELECT id FROM aevox.users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- INSERT/UPDATE: intentionally omitted.
-- All pipeline_runs writes are performed server-side via service role key only.

GRANT SELECT, INSERT, UPDATE                    ON aevox.pipeline_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE            ON aevox.pipeline_runs TO service_role;

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user_id   ON aevox.pipeline_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_config_id ON aevox.pipeline_runs(config_id);

-- ---------------------------------------------------------------------------
-- 4. aevox.usage_logs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aevox.usage_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES aevox.users(id) ON DELETE CASCADE,
  run_id     uuid        REFERENCES aevox.pipeline_runs(id) ON DELETE SET NULL,
  event_type text        NOT NULL,  -- 'voice_chars_used' | 'pipeline_run'
  chars_used int,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE aevox.usage_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows only.
CREATE POLICY "usage_logs_select_own" ON aevox.usage_logs
  FOR SELECT
  USING (
    user_id = (SELECT id FROM aevox.users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- INSERT: intentionally omitted.
-- usage_logs are written server-side via service role key only.

GRANT SELECT, INSERT                            ON aevox.usage_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE            ON aevox.usage_logs TO service_role;

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON aevox.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_run_id  ON aevox.usage_logs(run_id);

-- ---------------------------------------------------------------------------
-- 5. aevox.user_youtube_tokens
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aevox.user_youtube_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES aevox.users(id) ON DELETE CASCADE UNIQUE,
  access_token  text        NOT NULL,
  refresh_token text        NOT NULL,
  token_expiry  timestamptz NOT NULL,
  scope         text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE aevox.user_youtube_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: own row only.
CREATE POLICY "user_youtube_tokens_select_own" ON aevox.user_youtube_tokens
  FOR SELECT
  USING (
    user_id = (SELECT id FROM aevox.users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- INSERT/UPDATE: intentionally omitted.
-- Token storage and refresh are handled server-side via service role key only.

GRANT SELECT, INSERT, UPDATE                    ON aevox.user_youtube_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE            ON aevox.user_youtube_tokens TO service_role;

-- No separate index needed: UNIQUE constraint on user_id already creates one.
