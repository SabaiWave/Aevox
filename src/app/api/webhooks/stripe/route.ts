import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/rate-limit'

type Tier = 'free' | 'starter' | 'pro'

function tierFromPriceId(priceId: string): Tier {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  console.warn('[webhook/stripe] Unrecognized price ID — defaulting tier to free')
  return 'free'
}

export async function POST(req: NextRequest) {
  // ── 0. Rate limit by IP ────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { limited, retryAfterSeconds } = await checkRateLimit(`stripe-webhook:${ip}`, { windowMs: 60_000, max: 100 })
  if (limited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }

  // ── 1. Signature verification — must happen before any business logic ───────
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook/stripe] Signature verification failed:', err instanceof Error ? err.message : 'unknown')
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const clerkUserId = session.metadata?.clerkUserId
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null

      if (!clerkUserId || !stripeCustomerId) {
        console.warn('[webhook/stripe] checkout.session.completed missing clerkUserId or customer — skipping')
        break
      }

      // Retrieve subscription to resolve tier immediately — avoids race with subscription.created
      let tier: Tier = 'free'
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
      if (subscriptionId) {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price?.id ?? ''
        tier = tierFromPriceId(priceId)
      }

      const { error } = await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId, tier })
        .eq('clerk_id', clerkUserId)

      if (error) {
        console.error('[webhook/stripe] Failed to update stripe_customer_id + tier:', error.message)
        return Response.json({ error: 'DB update failed' }, { status: 500 })
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : null
      const priceId = subscription.items.data[0]?.price?.id ?? ''
      const tier = tierFromPriceId(priceId)
      const periodEnd = subscription.items.data[0]?.current_period_end
      const subscriptionCancelAt = subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : subscription.cancel_at_period_end && periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null

      if (!customerId) {
        console.warn('[webhook/stripe] subscription event missing customer ID — skipping')
        break
      }

      const { error } = await supabase
        .from('users')
        .update({ tier, subscription_cancel_at: subscriptionCancelAt })
        .eq('stripe_customer_id', customerId)

      if (error) {
        console.error('[webhook/stripe] Failed to update tier:', error.message)
        return Response.json({ error: 'DB update failed' }, { status: 500 })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : null

      if (!customerId) {
        console.warn('[webhook/stripe] subscription.deleted missing customer ID — skipping')
        break
      }

      const { error } = await supabase
        .from('users')
        .update({ tier: 'free', subscription_cancel_at: null })
        .eq('stripe_customer_id', customerId)

      if (error) {
        console.error('[webhook/stripe] Failed to reset tier:', error.message)
        return Response.json({ error: 'DB update failed' }, { status: 500 })
      }
      break
    }

    default:
      break
  }

  return Response.json({ received: true })
}
