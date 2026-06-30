import { NextRequest } from 'next/server'
import { log } from '@/lib/logger'
import { z } from 'zod'
import { auth, isApiRoute } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'

const TIER_CAPS: Record<string, number> = {
  free: 2,
  starter: 8,
  pro: 999,
}

const schema = z.object({
  action: z.enum(['fill', 'clear']),
})

export async function POST(req: NextRequest) {
  // ── 0. Confirm API route ───────────────────────────────────────────────────
  if (!isApiRoute(req)) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Admin check ─────────────────────────────────────────────────────────
  const adminOk = await isAdmin()
  // Double-check: isAdmin() internally reads ADMIN_USER_IDS and verifies userId is in it
  if (!adminOk) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // ── 3. Rate limit (by userId) ──────────────────────────────────────────────
  const { limited, retryAfterSeconds } = checkRateLimit(`quota-sim:${userId}`, {
    windowMs: 60_000,
    max: 10,
  })
  if (limited) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    )
  }

  // ── 4. Parse + validate body ───────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { action } = parsed.data
  const supabase = getSupabaseServerClient()

  // ── 5. Resolve Clerk userId → Supabase user row ────────────────────────────
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('id, tier')
    .eq('clerk_id', userId)
    .single()

  if (userErr || !userRow) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const userUuid: string = userRow.id
  const tier: string = userRow.tier ?? 'free'

  // ── 6a. Fill action ────────────────────────────────────────────────────────
  if (action === 'fill') {
    const cap = TIER_CAPS[tier] ?? 2

    // Count existing non-simulated video_generated events this month
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)

    const { count: currentCount } = await supabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userUuid)
      .eq('event_type', 'video_generated')
      .gte('created_at', monthStart.toISOString())

    const existing = currentCount ?? 0
    const toInsert = Math.max(0, cap - existing)

    if (toInsert === 0) {
      return Response.json({ success: true, count: 0 })
    }

    const rows = Array.from({ length: toInsert }, () => ({
      user_id: userUuid,
      event_type: 'video_generated',
      metadata: { simulated: true },
    }))

    const { error: insertErr } = await supabase.from('usage_logs').insert(rows)
    if (insertErr) {
      log.error('[quota-sim] fill insert failed', { error: insertErr.message })
      return Response.json({ error: 'Insert failed' }, { status: 500 })
    }

    return Response.json({ success: true, count: toInsert })
  }

  // ── 6b. Clear action ───────────────────────────────────────────────────────
  if (action === 'clear') {
    // Delete rows where metadata->>'simulated' = 'true' for this user
    const { count: deletedCount, error: deleteErr } = await supabase
      .from('usage_logs')
      .delete({ count: 'exact' })
      .eq('user_id', userUuid)
      .eq('metadata->>simulated', 'true')

    if (deleteErr) {
      log.error('[quota-sim] clear delete failed', { error: deleteErr.message })
      return Response.json({ error: 'Delete failed' }, { status: 500 })
    }

    return Response.json({ success: true, count: deletedCount ?? 0 })
  }

  // Should be unreachable due to Zod enum
  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
