export const runtime = 'nodejs'

import * as Sentry from '@sentry/nextjs'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { log } from '@/lib/logger'

// Admin-only GET — simulates an agent failure to verify log.error reaches BetterStack
// and Sentry captures the exception. Writes a real videos row (status: failed) for
// full observability coverage.
export async function GET() {
  const { userId } = await auth()
  if (!userId || !(await isAdmin())) {
    return new Response('Not found', { status: 404 })
  }

  const { limited, retryAfterSeconds } = await checkRateLimit(`debug-fail:${userId}`, {
    windowMs: 60_000,
    max: 10,
  })
  if (limited) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    )
  }

  const supabase = getSupabaseServerClient()
  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!adminUser) {
    return Response.json({ error: 'Admin user not found in Supabase' }, { status: 404 })
  }

  const runId = crypto.randomUUID()
  const now = new Date().toISOString()

  await supabase.from('videos').insert({
    id: runId,
    user_id: adminUser.id,
    config_id: null,
    topic: 'Debug: forced failure test',
    status: 'failed',
    is_dry_run: true,
    created_at: now,
    updated_at: now,
  })

  // Simulate a ResearchAgent failure — exercises the exact log + Sentry paths
  // that real agent failures hit at runtime.
  await log.error('[ResearchAgent] failed', {
    agent: 'research',
    runId,
    stage: 'research',
    durationMs: 0,
    error: 'Debug: forced failure via /api/debug/fail',
    dryRun: true,
  })

  const err = new Error('Klipto debug: ResearchAgent forced failure — triggered from /api/debug/fail')
  Sentry.captureException(err)
  await Sentry.flush(2000)

  return Response.json({
    ok: true,
    runId,
    message: 'Forced failure simulated — check BetterStack for log.error entry and Sentry for exception',
  })
}
