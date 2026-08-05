import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth, isApiRoute } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { encryptToken } from '@/lib/youtube-crypto'

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export async function GET(req: NextRequest) {
  // ── 0. Rate limit by IP (first operation) ─────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { limited, retryAfterSeconds } = await checkRateLimit(`youtube-callback:${ip}`, {
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

  // ── 2. Validate query params ───────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const parsed = callbackSchema.safeParse({
    code: searchParams.get('code'),
    state: searchParams.get('state'),
  })
  if (!parsed.success) {
    return Response.json({ error: 'Missing required query params' }, { status: 400 })
  }
  const { code, state } = parsed.data

  // ── 3. Verify state matches authenticated Clerk userId ────────────────────
  if (state !== userId) {
    return Response.json({ error: 'State mismatch — possible CSRF' }, { status: 400 })
  }

  // ── 4. Exchange code for tokens ────────────────────────────────────────────
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[api/auth/youtube/callback] Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET')
    return Response.json({ error: 'OAuth not configured' }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`

  let tokenData: GoogleTokenResponse
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) {
      console.error('[api/auth/youtube/callback] Token exchange failed, status:', tokenRes.status)
      return Response.json({ error: 'Token exchange failed' }, { status: 502 })
    }

    tokenData = (await tokenRes.json()) as GoogleTokenResponse
  } catch (err) {
    console.error('[api/auth/youtube/callback] Token exchange network error:', err instanceof Error ? err.message : 'unknown')
    return Response.json({ error: 'Token exchange error' }, { status: 502 })
  }

  const { access_token, refresh_token, expires_in } = tokenData

  if (!access_token) {
    console.error('[api/auth/youtube/callback] No access_token in response')
    return Response.json({ error: 'Invalid token response' }, { status: 502 })
  }

  // ── 5. Calculate token expiry ──────────────────────────────────────────────
  const tokenExpiry = new Date(Date.now() + expires_in * 1000).toISOString()

  // ── 6. Look up user UUID from Clerk ID ────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!user) {
    console.error('[api/auth/youtube/callback] User not found for clerk_id')
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // ── 7. Encrypt tokens ──────────────────────────────────────────────────────
  const encryptedAccessToken = encryptToken(access_token)
  const encryptedRefreshToken = refresh_token ? encryptToken(refresh_token) : null

  // ── 8. Upsert into user_youtube_tokens ────────────────────────────────────
  const { error: upsertError } = await supabase
    .from('user_youtube_tokens')
    .upsert(
      {
        user_id: user.id,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expiry: tokenExpiry,
        scope: 'youtube.upload',
      },
      { onConflict: 'user_id' },
    )

  if (upsertError) {
    console.error('[api/auth/youtube/callback] Failed to upsert token:', upsertError.message)
    return Response.json({ error: 'Failed to store token' }, { status: 500 })
  }

  console.log('[api/auth/youtube/callback] YouTube account connected event for user')

  // ── 9. Redirect to dashboard ───────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return Response.redirect(`${appUrl}/dashboard`, 302)
}
