import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth, isApiRoute } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { log } from '@/lib/logger'

const RequestSchema = z.object({})

export async function POST(req: NextRequest) {
  // ── 0. API route guard ────────────────────────────────────────────────────
  if (!isApiRoute(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── 1. Rate limit (by IP) ─────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (ip === 'unknown') {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { limited, retryAfterSeconds } = checkRateLimit(`stripe-portal:${ip}`, {
    windowMs: 60_000,
    max: 10,
  })
  if (limited) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }

  // ── 2. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 3. Validate request body ───────────────────────────────────────────────
  RequestSchema.parse({})

  // ── 4. Look up stripe_customer_id ─────────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user, error: dbError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('clerk_id', userId)
    .single()

  if (dbError) {
    log.error('Failed to fetch user stripe_customer_id', { userId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!user?.stripe_customer_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
  }

  // ── 5. Create billing portal session ──────────────────────────────────────
  const stripe = getStripe()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    log.error('NEXT_PUBLIC_APP_URL is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  let session: Awaited<ReturnType<typeof stripe.billingPortal.sessions.create>>
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${appUrl}/upgrade`,
    })
  } catch (err) {
    log.error('Stripe billing portal creation failed', { userId, err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 })
  }

  return NextResponse.json({ data: { url: session.url } })
}
