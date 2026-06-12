// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockVerify = jest.fn()

jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: mockVerify,
  })),
}))

const mockInsert = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

const mockIsUserCreatedEvent = jest.fn()

jest.mock('@/lib/clerk-webhook', () => ({
  isUserCreatedEvent: (...args: unknown[]) => mockIsUserCreatedEvent(...args),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from '@/app/api/webhooks/clerk/route'

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_CREATED_PAYLOAD = {
  type: 'user.created',
  data: {
    id: 'user_abc123',
    email_addresses: [{ email_address: 'alex@example.com', id: 'idn_abc123' }],
    primary_email_address_id: 'idn_abc123',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWebhookRequest(body: object, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'svix-id': 'msg_test',
      'svix-timestamp': '1234567890',
      'svix-signature': 'v1,signature',
      ...headers,
    },
  })
}

// ─── POST /api/webhooks/clerk ─────────────────────────────────────────────────

describe('POST /api/webhooks/clerk', () => {
  beforeAll(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  afterAll(() => {
    delete process.env.CLERK_WEBHOOK_SECRET
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Re-establish default mockFrom chain after clearAllMocks removes implementations
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('returns 400 when svix-id header is missing', async () => {
    const req = makeWebhookRequest(VALID_USER_CREATED_PAYLOAD, { 'svix-id': '' })

    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing svix headers')
  })

  it('returns 400 when svix-timestamp header is missing', async () => {
    const req = makeWebhookRequest(VALID_USER_CREATED_PAYLOAD, { 'svix-timestamp': '' })

    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing svix headers')
  })

  it('returns 400 when svix-signature header is missing', async () => {
    const req = makeWebhookRequest(VALID_USER_CREATED_PAYLOAD, { 'svix-signature': '' })

    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing svix headers')
  })

  it('returns 400 when signature verification fails', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const req = makeWebhookRequest(VALID_USER_CREATED_PAYLOAD)

    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid signature')
  })

  it('returns 200 for unhandled event type', async () => {
    const unhandledPayload = { type: 'user.updated', data: {} }
    mockVerify.mockReturnValue(unhandledPayload)
    mockIsUserCreatedEvent.mockReturnValue(false)

    const req = makeWebhookRequest(unhandledPayload)

    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns 200 and inserts user on valid user.created event', async () => {
    mockVerify.mockReturnValue(VALID_USER_CREATED_PAYLOAD)
    mockIsUserCreatedEvent.mockReturnValue(true)
    mockInsert.mockResolvedValue({ error: null })

    const req = makeWebhookRequest(VALID_USER_CREATED_PAYLOAD)

    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockInsert).toHaveBeenCalledWith({
      clerk_id: 'user_abc123',
      email: 'alex@example.com',
      tier: 'free',
    })
  })

  it('returns 500 when Supabase insert fails on user.created event', async () => {
    mockVerify.mockReturnValue(VALID_USER_CREATED_PAYLOAD)
    mockIsUserCreatedEvent.mockReturnValue(true)
    mockInsert.mockResolvedValue({ error: { message: 'duplicate key value' } })

    const req = makeWebhookRequest(VALID_USER_CREATED_PAYLOAD)

    const res = await POST(req as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to create user')
  })
})
