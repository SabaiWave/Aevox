export const runtime = 'nodejs'

import * as Sentry from '@sentry/nextjs'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET() {
  const { userId } = await auth()
  if (!userId || !(await isAdmin())) {
    return new Response('Not found', { status: 404 })
  }

  const { limited, retryAfterSeconds } = await checkRateLimit(`debug-sentry:${userId}`, { windowMs: 60_000, max: 10 })
  if (limited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }

  const err = new Error('Klipto Sentry test — triggered from /api/debug/sentry')
  Sentry.captureException(err)
  await Sentry.flush(2000)

  return Response.json({ ok: true, message: 'Sentry test event sent — check dashboard' })
}
