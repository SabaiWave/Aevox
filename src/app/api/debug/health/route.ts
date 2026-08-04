export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { VERSION } from '@/lib/version'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { limited, retryAfterSeconds } = await checkRateLimit(`health:${ip}`, { windowMs: 60_000, max: 60 })
  if (limited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }
  const ok =
    !!process.env.ANTHROPIC_API_KEY &&
    !!process.env.TAVILY_API_KEY &&
    !!process.env.ELEVENLABS_API_KEY &&
    !!process.env.FAL_KEY &&
    !!process.env.CLERK_SECRET_KEY &&
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_WEBHOOK_SECRET

  return NextResponse.json(
    { ok, version: VERSION, timestamp: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  )
}
