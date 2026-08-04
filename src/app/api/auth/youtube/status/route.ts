import { NextRequest } from 'next/server'
import { auth, isApiRoute } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  // ── 0. Rate limit by IP (first operation) ─────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { limited, retryAfterSeconds } = await checkRateLimit(`youtube-status:${ip}`, {
    windowMs: 60_000,
    max: 30,
  })
  if (limited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  if (!isApiRoute(req)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Look up user UUID from Clerk ID ─────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!user) {
    // User row not yet provisioned — treat as disconnected
    return Response.json({ data: { status: 'disconnected' } })
  }

  // ── 3. Query user_youtube_tokens ───────────────────────────────────────────
  const { data: tokenRow } = await supabase
    .from('user_youtube_tokens')
    .select('token_expiry')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow) {
    return Response.json({ data: { status: 'disconnected' } })
  }

  // ── 4. Determine status from token_expiry ──────────────────────────────────
  // connected: token_expiry > now + 5 min
  // expired:   token_expiry <= now + 5 min
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000
  const expiry = new Date(tokenRow.token_expiry).getTime()
  const status = expiry > fiveMinutesFromNow ? 'connected' : 'expired'

  return Response.json({ data: { status } })
}
