// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSend = jest.fn()

jest.mock('@/lib/email', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendEmail: (...args: any[]) => mockSend(...args),
  getFromAddress: jest.fn(() => 'Klipto <noreply@klipto.ai>'),
}))

jest.mock('@/lib/auth', () => ({
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

import { POST } from '@/app/api/contact/route'
import { isApiRoute } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { log } from '@/lib/logger'

const mockIsApiRoute = isApiRoute as unknown as jest.Mock
const mockCheckRateLimit = checkRateLimit as unknown as jest.Mock
const mockLog = log as { info: jest.Mock; warn: jest.Mock; error: jest.Mock }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_BODY = {
  name: 'Alice',
  email: 'alice@example.com',
  message: 'Hello from the contact form.',
}

function makeRequest(
  body: unknown = VALID_BODY,
  headers: Record<string, string> = {}
): Request {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '1.2.3.4',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

// ─── POST /api/contact ────────────────────────────────────────────────────────

describe('POST /api/contact', () => {
  beforeAll(() => {
    process.env.SUPPORT_EMAIL = 'support@klipto.ai'
  })

  afterAll(() => {
    delete process.env.SUPPORT_EMAIL
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Re-establish default mock implementations after clearAllMocks
    mockIsApiRoute.mockReturnValue(true)
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
    mockSend.mockResolvedValue(undefined)
  })

  it('returns 404 when isApiRoute returns false', async () => {
    mockIsApiRoute.mockReturnValue(false)

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('returns 429 when IP is unknown (no x-forwarded-for or x-real-ip)', async () => {
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
      // no x-forwarded-for or x-real-ip — IP resolves to 'unknown'
    })
    const res = await POST(req as never)

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 429 with Retry-After header when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 300 })

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
    expect(res.headers.get('Retry-After')).toBe('300')
  })

  it('returns 400 when name is missing', async () => {
    const req = makeRequest({ email: 'alice@example.com', message: 'Hello' })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid fields')
  })

  it('returns 400 when email is invalid', async () => {
    const req = makeRequest({ name: 'Alice', email: 'not-an-email', message: 'Hello' })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid fields')
  })

  it('returns 400 when message exceeds 2000 characters', async () => {
    const req = makeRequest({ name: 'Alice', email: 'alice@example.com', message: 'x'.repeat(2001) })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid fields')
  })

  it('calls sendEmail with correct to, from, subject, and text on valid body', async () => {
    const req = makeRequest()
    await POST(req as never)

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith({
      from: 'Klipto <noreply@klipto.ai>',
      to: 'support@klipto.ai',
      subject: 'Contact form: Alice',
      text: `Name: Alice\nEmail: alice@example.com\n\nHello from the contact form.`,
    })
  })

  it('returns { success: true } on valid body', async () => {
    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true })
  })

  it('returns 500 with generic error when Brevo throws', async () => {
    mockSend.mockRejectedValue(new Error('Brevo network timeout'))

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to send message')
  })

  it('does not expose the raw Brevo error message in the 500 response', async () => {
    mockSend.mockRejectedValue(new Error('Brevo network timeout'))

    const req = makeRequest()
    const res = await POST(req as never)

    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('Brevo network timeout')
  })

  it('logs the error when Brevo throws', async () => {
    mockSend.mockRejectedValue(new Error('Brevo network timeout'))

    const req = makeRequest()
    await POST(req as never)

    expect(mockLog.error).toHaveBeenCalledTimes(1)
    expect(mockLog.error).toHaveBeenCalledWith(
      '[contact] send failed',
      expect.objectContaining({ error: 'Brevo network timeout' })
    )
  })

  it('subject includes only name, not message content', async () => {
    const sensitiveMessage = 'secret-payload-should-not-be-in-subject'
    const req = makeRequest({ name: 'Alice', email: 'alice@example.com', message: sensitiveMessage })
    await POST(req as never)

    const callArgs = mockSend.mock.calls[0][0] as { subject: string }
    expect(callArgs.subject).toBe('Contact form: Alice')
    expect(callArgs.subject).not.toContain(sensitiveMessage)
  })
})
