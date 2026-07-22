import { NextRequest } from 'next/server'
import { auth, isApiRoute } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  // ── 0. Rate limit by IP (first operation) ─────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { limited, retryAfterSeconds } = checkRateLimit(`youtube-initiate:${ip}`, {
    windowMs: 60_000,
    max: 5,
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

  // ── 2. Build Google OAuth URL ──────────────────────────────────────────────
  const clientId = process.env.YOUTUBE_CLIENT_ID
  if (!clientId) {
    console.error('[api/auth/youtube] YOUTUBE_CLIENT_ID not set')
    return Response.json({ error: 'OAuth not configured' }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  // ── 3. Redirect to Google ──────────────────────────────────────────────────
  return Response.redirect(authUrl, 302)
}

export async function DELETE(req: NextRequest) {
  // ── 0. Rate limit ──────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { limited, retryAfterSeconds } = checkRateLimit(`youtube-disconnect:${ip}`, {
    windowMs: 60_000,
    max: 10,
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

  // ── 2. Resolve Supabase user UUID ──────────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!user) {
    return Response.json({ data: { disconnected: true } })
  }

  // ── 3. Delete token row ────────────────────────────────────────────────────
  const { error } = await supabase
    .from('user_youtube_tokens')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    console.error('[api/auth/youtube] disconnect failed', { userId })
    return Response.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return Response.json({ data: { disconnected: true } })
}
