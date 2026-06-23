import { NextRequest } from 'next/server'
import { Webhook } from 'svix'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { isUserCreatedEvent } from '@/lib/clerk-webhook'

export async function POST(req: NextRequest) {
  // ── 1. Verify CLERK_WEBHOOK_SECRET is configured ──────────────────────────
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook/clerk] CLERK_WEBHOOK_SECRET not configured')
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // ── 2. Extract svix headers ───────────────────────────────────────────────
  const svixId        = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  // ── 3. Read raw body (required for signature verification) ────────────────
  const body = await req.text()

  // ── 4. Verify signature ───────────────────────────────────────────────────
  let payload: unknown
  try {
    const wh = new Webhook(webhookSecret)
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as unknown
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── 5. Route by event type ────────────────────────────────────────────────
  if (!isUserCreatedEvent(payload)) {
    // Unhandled event type — acknowledge so Clerk marks delivery success
    return Response.json({ received: true }, { status: 200 })
  }

  const event = payload
  console.log('[webhook/clerk] Handling event type:', event.type)

  // ── 6. Extract primary email ──────────────────────────────────────────────
  const primaryEmailEntry = event.data.email_addresses.find(
    e => e.id === event.data.primary_email_address_id,
  ) ?? event.data.email_addresses[0]

  if (!primaryEmailEntry) {
    console.error('[webhook/clerk] user.created event has no email addresses')
    return Response.json({ error: 'No email address on user' }, { status: 400 })
  }

  const primaryEmail = primaryEmailEntry.email_address

  // ── 7. Insert user row ────────────────────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from('users').insert({
    clerk_id: event.data.id,
    email: primaryEmail,
    tier: 'free',
  })

  if (error) {
    console.error('[webhook/clerk] Failed to insert user:', error.message)
    return Response.json({ error: 'Failed to create user' }, { status: 500 })
  }

  return Response.json({ received: true }, { status: 200 })
}
