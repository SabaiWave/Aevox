// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPortalCreate = jest.fn()

jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(() => ({
    billingPortal: {
      sessions: {
        create: mockPortalCreate,
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
  isApiRoute: jest.fn(() => true),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(() => ({ limited: false, retryAfterSeconds: 0 })),
}))

jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from '@/app/api/stripe/portal/route'
import { auth, isApiRoute } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { log } from '@/lib/logger'

const mockAuth = auth as unknown as jest.Mock
const mockIsApiRoute = isApiRoute as unknown as jest.Mock
const mockCheckRateLimit = checkRateLimit as jest.Mock
const mockLog = log as { info: jest.Mock; warn: jest.Mock; error: jest.Mock }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/stripe/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '1.2.3.4',
      ...headers,
    },
    body: JSON.stringify({}),
  })
}

// ─── POST /api/stripe/portal ──────────────────────────────────────────────────

describe('POST /api/stripe/portal', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Re-establish default mock chains after clearAllMocks removes implementations
    mockAuth.mockResolvedValue({ userId: 'user_123' })
    mockIsApiRoute.mockReturnValue(true)
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
    mockSingle.mockResolvedValue({ data: { stripe_customer_id: 'cus_abc123' }, error: null })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
    mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session/test_123' })
    mockLog.error.mockResolvedValue(undefined)
  })

  it('returns 403 when isApiRoute check fails', async () => {
    mockIsApiRoute.mockReturnValue(false)

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 429 when IP is unknown', async () => {
    const req = new Request('http://localhost/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      // no x-forwarded-for header — IP will be 'unknown'
    })
    const res = await POST(req as never)

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 45 })

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
    expect(res.headers.get('Retry-After')).toBe('45')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when user has no stripe_customer_id', async () => {
    mockSingle.mockResolvedValue({ data: { stripe_customer_id: null }, error: null })

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No active subscription')
  })

  it('returns 400 when user row has no stripe_customer_id field at all', async () => {
    mockSingle.mockResolvedValue({ data: {}, error: null })

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No active subscription')
  })

  it('returns 500 when Supabase DB error occurs', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB connection failed' } })

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })

  it('does not log customer ID in Supabase error case', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB connection failed' } })

    const req = makeRequest()
    await POST(req as never)

    expect(mockLog.error).toHaveBeenCalledTimes(1)
    const [, meta] = mockLog.error.mock.calls[0]
    expect(JSON.stringify(meta)).not.toContain('cus_')
  })

  it('returns 500 when NEXT_PUBLIC_APP_URL is not set', async () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_APP_URL

    const req = makeRequest()
    const res = await POST(req as never)

    process.env.NEXT_PUBLIC_APP_URL = prev

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Server configuration error')
  })

  it('returns 500 when Stripe billing portal creation throws', async () => {
    mockPortalCreate.mockRejectedValue(new Error('Stripe network error'))

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to create billing portal session')
  })

  it('does not log portal URL in Stripe error case', async () => {
    mockPortalCreate.mockRejectedValue(new Error('Stripe network error'))

    const req = makeRequest()
    await POST(req as never)

    expect(mockLog.error).toHaveBeenCalledTimes(1)
    const [, meta] = mockLog.error.mock.calls[0]
    expect(JSON.stringify(meta)).not.toContain('billing.stripe.com')
  })

  it('returns { data: { url } } on success', async () => {
    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.url).toBe('https://billing.stripe.com/session/test_123')
  })

  it('calls Stripe billing portal with correct customer and return_url', async () => {
    const req = makeRequest()
    await POST(req as never)

    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: 'cus_abc123',
      return_url: 'http://localhost:3000/upgrade',
    })
  })

  it('queries Supabase users table by clerk_id for stripe_customer_id', async () => {
    const req = makeRequest()
    await POST(req as never)

    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockSelect).toHaveBeenCalledWith('stripe_customer_id')
    expect(mockEq).toHaveBeenCalledWith('clerk_id', 'user_123')
  })
})
