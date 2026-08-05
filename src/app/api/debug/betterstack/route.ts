export const runtime = 'nodejs'

import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET() {
  const { userId } = await auth()
  const adminCheck = await isAdmin()
  if (!userId || !adminCheck) {
    return new Response('Not found', { status: 404 })
  }

  const { limited, retryAfterSeconds } = await checkRateLimit(`debug-betterstack:${userId}`, { windowMs: 60_000, max: 10 })
  if (limited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }

  const token = process.env.BETTERSTACK_SOURCE_TOKEN
  const url = process.env.BETTERSTACK_INGEST_URL
  if (!token || !url) {
    return Response.json({ ok: false, error: 'BETTERSTACK_SOURCE_TOKEN or BETTERSTACK_INGEST_URL not set' }, { status: 500 })
  }

  const dt = new Date().toISOString()
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dt, level: 'info', message: 'Klipto BetterStack test — triggered from /api/debug/betterstack' }),
    })
  } catch {
    return Response.json({ error: 'BetterStack unreachable' }, { status: 502 })
  }

  if (!res.ok) {
    return Response.json({ error: 'BetterStack rejected the request', code: String(res.status) }, { status: 502 })
  }

  return Response.json({ ok: true, message: 'Log entry sent to BetterStack.', dt })
}
