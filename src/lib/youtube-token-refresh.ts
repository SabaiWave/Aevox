import { getSupabaseServerClient } from '@/lib/supabase-server'
import { encryptToken, decryptToken } from '@/lib/youtube-crypto'

export interface YouTubeTokenResult {
  accessToken: string  // plaintext, ready to use
  connected: boolean   // false if no token record found
}

export async function getValidYouTubeToken(userUuid: string): Promise<YouTubeTokenResult> {
  const supabase = getSupabaseServerClient()

  const { data: tokenRow } = await supabase
    .from('user_youtube_tokens')
    .select('access_token, refresh_token, token_expiry')
    .eq('user_id', userUuid)
    .single()

  if (!tokenRow || !tokenRow.token_expiry) return { accessToken: '', connected: false }

  const expiresAt = new Date(tokenRow.token_expiry).getTime()
  const fiveMinMs = 5 * 60 * 1000
  const needsRefresh = Date.now() + fiveMinMs >= expiresAt

  if (!needsRefresh) {
    const token = decryptToken(tokenRow.access_token)
    console.log(`[youtube-token-refresh] Using cached token, prefix=${token.slice(0, 8)}..., expires=${tokenRow.token_expiry}`)
    return { accessToken: token, connected: true }
  }

  // Refresh the token
  const refreshToken = decryptToken(tokenRow.refresh_token)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('[youtube-token-refresh] Refresh failed, status:', tokenRes.status, body.slice(0, 200))
    // Return existing token even if refresh failed — may still be valid
    return { accessToken: decryptToken(tokenRow.access_token), connected: true }
  }

  const tokens = await tokenRes.json() as { access_token?: string; expires_in?: number }

  if (!tokens.access_token || typeof tokens.expires_in !== 'number') {
    console.error('[youtube-token-refresh] Unexpected token response shape')
    return { accessToken: decryptToken(tokenRow.access_token), connected: true }
  }

  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Update stored access token (refresh token typically stays the same)
  await supabase
    .from('user_youtube_tokens')
    .update({
      access_token: encryptToken(tokens.access_token),
      token_expiry: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userUuid)

  return { accessToken: tokens.access_token, connected: true }
}
