// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = jest.fn()

jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(() => ({
    checkout: {
      sessions: {
        create: mockCreate,
      },
    },
  })),
}))

const mockSingle = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({ userId: 'user_123' })),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(() => ({ limited: false, retryAfterSeconds: 0 })),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from '@/app/api/stripe/checkout/route'
import { auth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

const mockAuth = auth as unknown as jest.Mock
const mockCheckRateLimit = checkRateLimit as jest.Mock

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── POST /api/stripe/checkout ────────────────────────────────────────────────

describe('POST /api/stripe/checkout', () => {
  beforeAll(() => {
    process.env.STRIPE_STARTER_PRICE_ID = 'price_starter_123'
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro_456'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  afterAll(() => {
    delete process.env.STRIPE_STARTER_PRICE_ID
    delete process.env.STRIPE_PRO_PRICE_ID
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Re-establish default mock chains after clearAllMocks removes implementations
    mockAuth.mockResolvedValue({ userId: 'user_123' })
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
    mockSingle.mockResolvedValue({ data: { id: 'uuid-abc', email: 'test@example.com' } })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
    mockCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test_123' })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const req = makeRequest({ priceId: 'price_starter_123' })
    const res = await POST(req as never)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 45 })

    const req = makeRequest({ priceId: 'price_starter_123' })
    const res = await POST(req as never)

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
    expect(res.headers.get('Retry-After')).toBe('45')
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json{{{',
    })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid JSON')
  })

  it('returns 400 for missing priceId', async () => {
    const req = makeRequest({})
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
    expect(body.details).toBeDefined()
  })

  it('returns 400 for unknown priceId not in allowlist', async () => {
    const req = makeRequest({ priceId: 'price_unknown_999' })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid price ID')
  })

  it('returns 404 when user not found in Supabase', async () => {
    mockSingle.mockResolvedValue({ data: null })

    const req = makeRequest({ priceId: 'price_starter_123' })
    const res = await POST(req as never)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('User not found')
  })

  it('returns 500 when Stripe throws an error', async () => {
    mockCreate.mockRejectedValue(new Error('Stripe network error'))

    const req = makeRequest({ priceId: 'price_starter_123' })
    const res = await POST(req as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to create checkout session')
  })

  it('returns 500 when Stripe session url is null', async () => {
    mockCreate.mockResolvedValue({ url: null })

    const req = makeRequest({ priceId: 'price_starter_123' })
    const res = await POST(req as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to create checkout session')
  })

  it('returns 200 with { data: { url } } on success with starter price', async () => {
    const req = makeRequest({ priceId: 'price_starter_123' })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.url).toBe('https://checkout.stripe.com/pay/cs_test_123')
  })

  it('returns 200 with { data: { url } } on success with pro price', async () => {
    const req = makeRequest({ priceId: 'price_pro_456' })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.url).toBe('https://checkout.stripe.com/pay/cs_test_123')
  })

  it('calls Stripe with correct session parameters', async () => {
    const req = makeRequest({ priceId: 'price_starter_123' })
    await POST(req as never)

    expect(mockCreate).toHaveBeenCalledWith({
      mode: 'subscription',
      line_items: [{ price: 'price_starter_123', quantity: 1 }],
      customer_email: 'test@example.com',
      metadata: { clerkUserId: 'user_123' },
      success_url: 'http://localhost:3000/dashboard?upgraded=true',
      cancel_url: 'http://localhost:3000/upgrade',
    })
  })

  it('queries Supabase users table by clerk_id', async () => {
    const req = makeRequest({ priceId: 'price_starter_123' })
    await POST(req as never)

    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockSelect).toHaveBeenCalledWith('id, email')
    expect(mockEq).toHaveBeenCalledWith('clerk_id', 'user_123')
  })
})
