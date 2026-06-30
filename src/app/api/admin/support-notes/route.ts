import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth, isApiRoute } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { log } from '@/lib/logger'

const schema = z.object({
  userId: z.string().uuid(),
  notes: z.string().max(2000),
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
  const { limited, retryAfterSeconds } = checkRateLimit(`support-notes:${userId}`, {
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

  const { userId: targetUserId, notes } = parsed.data

  // ── 5. Update support_notes ────────────────────────────────────────────────
  const supabase = getSupabaseServerClient()

  const { error: updateErr } = await supabase
    .from('users')
    .update({ support_notes: notes })
    .eq('id', targetUserId)

  if (updateErr) {
    log.error('[support-notes] update failed', { error: updateErr.message })
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  return Response.json({ success: true })
}
