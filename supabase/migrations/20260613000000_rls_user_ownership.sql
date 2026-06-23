-- Migration: rls user ownership — 2026-06-13
-- Replaces Phase 1 open stub policies (USING (true)) with real user-ownership
-- policies keyed on Clerk JWT sub → users.clerk_id → users.id.
--
-- Auth model: Clerk v7 JWTs accepted by Supabase.
--   auth.jwt() ->> 'sub'  returns the Clerk userId (text).
--   users.clerk_id        maps Clerk userId to internal uuid (users.id).
--   users.id              is the FK used in all other tables.
--
-- Server-side API routes use the service role key and bypass RLS entirely.
-- These policies gate the anon/authenticated browser client only.

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "users_owner_policy" ON users;

-- SELECT: own row only.
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (clerk_id = (auth.jwt() ->> 'sub'));

-- UPDATE: own row only.
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (clerk_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

-- INSERT: intentionally omitted.
-- User creation is handled server-side via Clerk webhook using the service role key.

-- ---------------------------------------------------------------------------
-- 2. channel_configs
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "channel_configs_owner_policy" ON channel_configs;

-- SELECT: rows belonging to the authenticated user.
CREATE POLICY "channel_configs_select_own" ON channel_configs
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- INSERT: only allowed if inserting under own user_id.
CREATE POLICY "channel_configs_insert_own" ON channel_configs
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- UPDATE: own rows only.
CREATE POLICY "channel_configs_update_own" ON channel_configs
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- DELETE: intentionally omitted.
-- Soft deletes not implemented; hard deletes not permitted via client.

-- ---------------------------------------------------------------------------
-- 3. pipeline_runs
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "pipeline_runs_owner_policy" ON pipeline_runs;

-- SELECT: own rows only.
CREATE POLICY "pipeline_runs_select_own" ON pipeline_runs
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- INSERT/UPDATE: intentionally omitted.
-- All pipeline_runs writes are performed server-side via service role key only.

-- ---------------------------------------------------------------------------
-- 4. usage_logs
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "usage_logs_owner_policy" ON usage_logs;

-- SELECT: own rows only.
CREATE POLICY "usage_logs_select_own" ON usage_logs
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- INSERT: intentionally omitted.
-- usage_logs are written server-side via service role key only.

-- ---------------------------------------------------------------------------
-- 5. user_youtube_tokens
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "user_youtube_tokens_owner_policy" ON user_youtube_tokens;

-- SELECT: own row only.
CREATE POLICY "user_youtube_tokens_select_own" ON user_youtube_tokens
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

-- INSERT/UPDATE: intentionally omitted.
-- Token storage and refresh are handled server-side via service role key only.
