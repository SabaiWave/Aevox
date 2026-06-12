import { NextRequest } from 'next/server'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = jest.fn()
jest.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
  currentUser: jest.fn(),
  isApiRoute: jest.fn(() => true),
}))

const mockCheckRateLimit = jest.fn()
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

const mockFrom = jest.fn()
jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET } from '@/app/api/auth/youtube/status/route'

// ─── Constants ────────────────────────────────────────────────────────────────

const CLERK_USER_ID = 'user_clerk_abc123'
const USER_UUID = 'deadbeef-dead-beef-dead-beefdeadbeef'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()  // 1hr
const nearExpiry = new Date(Date.now() + 2 * 60 * 1000).toISOString()     // 2min

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/auth/youtube/status', {
    method: 'GET',
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
}

/**
 * Wire up mockFrom to return the standard two-query chain:
 *   users  → { data: { id: USER_UUID } }  (or null for userRow)
 *   user_youtube_tokens → { data: tokenRow }
 */
function wireSupabaseMock(
  userRow: { id: string } | null,
  tokenRow: { token_expiry: string } | null,
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: userRow, error: null }),
          }),
        }),
      }
    }
    if (table === 'user_youtube_tokens') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: tokenRow, error: null }),
          }),
        }),
      }
    }
    return {}
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/auth/youtube/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: not rate limited
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
    // Default: authenticated
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
    // Default: user exists, token exists with far future expiry
    wireSupabaseMock({ id: USER_UUID }, { token_expiry: futureExpiry })
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 45 })

    const res = await GET(makeRequest())

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('45')
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await GET(makeRequest())

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns disconnected when user not found in users table', async () => {
    wireSupabaseMock(null, null)

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('disconnected')
  })

  it('returns disconnected when no token row found', async () => {
    wireSupabaseMock({ id: USER_UUID }, null)

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('disconnected')
  })

  it('returns connected when token_expiry is far in the future', async () => {
    wireSupabaseMock({ id: USER_UUID }, { token_expiry: futureExpiry })

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('connected')
  })

  it('returns expired when token_expiry is within 5 minutes', async () => {
    wireSupabaseMock({ id: USER_UUID }, { token_expiry: nearExpiry })

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('expired')
  })
})
