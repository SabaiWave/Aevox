import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

const schema = z.object({
  plan: z.enum(['starter', 'pro']),
})

export async function POST(req: NextRequest) {
  // ── 0. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 1. Rate limit (by userId) ─────────────────────────────────────────────
  const { limited, retryAfterSeconds } = await checkRateLimit(`stripe-checkout:${userId}`, {
    windowMs: 60_000,
    max: 10,
  })
  if (limited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }

  // ── 2. Parse + validate body ───────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { plan } = parsed.data
  const planPriceMap: Record<string, string | undefined> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    pro: process.env.STRIPE_PRO_PRICE_ID,
  }
  const priceId = planPriceMap[plan]
  if (!priceId) {
    return Response.json({ error: 'Plan price not configured' }, { status: 500 })
  }

  // ── 3. Look up internal user UUID + email ──────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('clerk_id', userId)
    .single()

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  // ── 4. Create Stripe Checkout Session ─────────────────────────────────────
  const stripe = getStripe()

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: { clerkUserId: userId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
    })
  } catch (err) {
    console.error('[api/stripe/checkout] Stripe error:', err instanceof Error ? err.message : 'unknown')
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }

  if (!session.url) {
    console.error('[api/stripe/checkout] Stripe returned null session URL')
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }

  return Response.json({ data: { url: session.url } })
}
