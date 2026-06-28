// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockConstructEvent = jest.fn()

jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  })),
}))

const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(() => ({ limited: false, retryAfterSeconds: 0 })),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from '@/app/api/webhooks/stripe/route'
import { checkRateLimit } from '@/lib/rate-limit'

const mockCheckRateLimit = checkRateLimit as jest.Mock

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStripeRequest(body: object, sig = 'valid-sig'): Request {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'stripe-signature': sig,
      'x-forwarded-for': '1.2.3.4',
    },
  })
}

function makeEvent(type: string, data: object): object {
  return { type, data: { object: data } }
}

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────

describe('POST /api/webhooks/stripe', () => {
  beforeAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.STRIPE_STARTER_PRICE_ID = 'price_starter_123'
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro_456'
  })

  afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.STRIPE_STARTER_PRICE_ID
    delete process.env.STRIPE_PRO_PRICE_ID
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Re-establish default mock chains after clearAllMocks removes implementations
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 30 })
    const req = makeStripeRequest({})
    const res = await POST(req as never)
    expect(res.status).toBe(429)
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching')
    })

    const req = makeStripeRequest({})
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid signature')
  })

  it('returns 200 when signature is valid', async () => {
    const event = makeEvent('unknown.event', {})
    mockConstructEvent.mockReturnValue(event)

    const req = makeStripeRequest(event)
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })

  it('checkout.session.completed updates stripe_customer_id and tier', async () => {
    const session = {
      customer: 'cus_abc123',
      metadata: { clerkUserId: 'user_clerk_abc' },
      // no subscription — tier defaults to 'free'
    }
    const event = makeEvent('checkout.session.completed', session)
    mockConstructEvent.mockReturnValue(event)

    const req = makeStripeRequest(event)
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockUpdate).toHaveBeenCalledWith({ stripe_customer_id: 'cus_abc123', tier: 'free' })
    expect(mockEq).toHaveBeenCalledWith('clerk_id', 'user_clerk_abc')
  })

  it('checkout.session.completed returns 500 on DB error', async () => {
    mockEq.mockResolvedValue({ error: { message: 'DB connection lost' } })
    const session = {
      customer: 'cus_abc123',
      metadata: { clerkUserId: 'user_clerk_abc' },
    }
    const event = makeEvent('checkout.session.completed', session)
    mockConstructEvent.mockReturnValue(event)

    const req = makeStripeRequest(event)
    const res = await POST(req as never)

    expect(res.status).toBe(500)
  })

  it('customer.subscription.deleted sets tier to free', async () => {
    const subscription = {
      customer: 'cus_abc123',
      items: { data: [{ price: { id: 'price_starter_123' } }] },
    }
    const event = makeEvent('customer.subscription.deleted', subscription)
    mockConstructEvent.mockReturnValue(event)

    const req = makeStripeRequest(event)
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockUpdate).toHaveBeenCalledWith({ tier: 'free' })
    expect(mockEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_abc123')
  })

  it('customer.subscription.created sets tier based on starter price ID', async () => {
    const subscription = {
      customer: 'cus_abc123',
      items: { data: [{ price: { id: 'price_starter_123' } }] },
    }
    const event = makeEvent('customer.subscription.created', subscription)
    mockConstructEvent.mockReturnValue(event)

    const req = makeStripeRequest(event)
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ tier: 'starter' })
    expect(mockEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_abc123')
  })

  it('customer.subscription.updated sets tier based on pro price ID', async () => {
    const subscription = {
      customer: 'cus_abc123',
      items: { data: [{ price: { id: 'price_pro_456' } }] },
    }
    const event = makeEvent('customer.subscription.updated', subscription)
    mockConstructEvent.mockReturnValue(event)

    const req = makeStripeRequest(event)
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ tier: 'pro' })
    expect(mockEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_abc123')
  })

  it('customer.subscription.updated defaults to free for unknown price ID', async () => {
    const subscription = {
      customer: 'cus_abc123',
      items: { data: [{ price: { id: 'price_unknown_999' } }] },
    }
    const event = makeEvent('customer.subscription.updated', subscription)
    mockConstructEvent.mockReturnValue(event)

    const req = makeStripeRequest(event)
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ tier: 'free' })
  })
})
