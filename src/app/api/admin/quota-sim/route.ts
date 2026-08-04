import { NextRequest } from 'next/server'
import { log } from '@/lib/logger'
import { z } from 'zod'
import { auth, isApiRoute } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'

const VIDEO_CAPS: Record<string, number> = {
  free: 2,
  starter: 8,
}

const CHAR_CAPS: Record<string, number> = {
  free: 10_000,
  starter: 100_000,
}

const schema = z.object({
  action: z.enum(['fill_videos', 'fill_chars', 'clear', 'clear_real', 'clear_dry', 'clear_all']),
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
  if (!adminOk) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // ── 3. Rate limit (by userId) ──────────────────────────────────────────────
  const { limited, retryAfterSeconds } = await checkRateLimit(`quota-sim:${userId}`, {
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

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const monthStartIso = monthStart.toISOString()

  // ── 6a. fill_videos ────────────────────────────────────────────────────────
  if (action === 'fill_videos') {
    const cap = VIDEO_CAPS[tier]
    if (cap === undefined) {
      return Response.json({ success: true, count: 0, warning: `${tier} tier has no video cap — nothing to fill` })
    }

    const { count: existing } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userUuid)
      .eq('is_dry_run', false)
      .gte('created_at', monthStartIso)

    const toInsert = Math.max(0, cap - (existing ?? 0))

    if (toInsert === 0) {
      return Response.json({ success: true, count: 0, warning: 'Already at cap — no rows inserted.' })
    }

    const rows = Array.from({ length: toInsert }, () => ({
      user_id: userUuid,
      config_id: null,
      topic: '__sim__',
      status: 'complete',
      is_dry_run: false,
      is_simulated: true,
      chars_used: 0,
    }))

    const { error: insertErr } = await supabase.from('videos').insert(rows)
    if (insertErr) {
      log.error('[quota-sim] fill_videos insert failed', { error: insertErr.message })
      return Response.json({ error: 'Insert failed' }, { status: 500 })
    }

    return Response.json({ success: true, count: toInsert })
  }

  // ── 6b. fill_chars ─────────────────────────────────────────────────────────
  if (action === 'fill_chars') {
    const cap = CHAR_CAPS[tier]
    if (cap === undefined) {
      return Response.json({ success: true, count: 0, warning: `${tier} tier has no char cap — nothing to fill` })
    }

    const { data: charRows } = await supabase
      .from('videos')
      .select('chars_used')
      .eq('user_id', userUuid)
      .eq('is_dry_run', false)
      .gte('created_at', monthStartIso)

    const existingChars = (charRows ?? []).reduce(
      (sum, row) => sum + (Number(row.chars_used) || 0),
      0,
    )

    const needed = Math.max(0, cap + 1 - existingChars)
    if (needed === 0) {
      return Response.json({ success: true, count: 0, warning: 'Already at cap — no rows inserted.' })
    }

    const { error: insertErr } = await supabase.from('videos').insert({
      user_id: userUuid,
      config_id: null,
      topic: '__sim__',
      status: 'complete',
      is_dry_run: false,
      is_simulated: true,
      chars_used: needed,
    })
    if (insertErr) {
      log.error('[quota-sim] fill_chars insert failed', { error: insertErr.message })
      return Response.json({ error: 'Insert failed' }, { status: 500 })
    }

    return Response.json({ success: true, count: 1 })
  }

  // ── 6c. clear (sim rows only) ─────────────────────────────────────────────
  if (action === 'clear') {
    const { count: deletedCount, error: deleteErr } = await supabase
      .from('videos')
      .delete({ count: 'exact' })
      .eq('user_id', userUuid)
      .eq('is_simulated', true)

    if (deleteErr) {
      log.error('[quota-sim] clear delete failed', { error: deleteErr.message })
      return Response.json({ error: 'Delete failed' }, { status: 500 })
    }

    return Response.json({ success: true, count: deletedCount ?? 0 })
  }

  // ── 6d. clear_real (real runs — quota reset) ───────────────────────────────
  if (action === 'clear_real') {
    const { count: deletedCount, error: deleteErr } = await supabase
      .from('videos')
      .delete({ count: 'exact' })
      .eq('user_id', userUuid)
      .eq('is_dry_run', false)
      .eq('is_simulated', false)

    if (deleteErr) {
      log.error('[quota-sim] clear_real delete failed', { error: deleteErr.message })
      return Response.json({ error: 'Delete failed' }, { status: 500 })
    }

    return Response.json({ success: true, count: deletedCount ?? 0 })
  }

  // ── 6e. clear_dry (dry/test run rows) ─────────────────────────────────────
  if (action === 'clear_dry') {
    const { count: deletedCount, error: deleteErr } = await supabase
      .from('videos')
      .delete({ count: 'exact' })
      .eq('user_id', userUuid)
      .eq('is_dry_run', true)

    if (deleteErr) {
      log.error('[quota-sim] clear_dry delete failed', { error: deleteErr.message })
      return Response.json({ error: 'Delete failed' }, { status: 500 })
    }

    return Response.json({ success: true, count: deletedCount ?? 0 })
  }

  // ── 6f. clear_all (nuke all videos for this user) ─────────────────────────
  if (action === 'clear_all') {
    const { count: deletedCount, error: deleteErr } = await supabase
      .from('videos')
      .delete({ count: 'exact' })
      .eq('user_id', userUuid)

    if (deleteErr) {
      log.error('[quota-sim] clear_all delete failed', { error: deleteErr.message })
      return Response.json({ error: 'Delete failed' }, { status: 500 })
    }

    return Response.json({ success: true, count: deletedCount ?? 0 })
  }

  // Unreachable due to Zod enum
  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
