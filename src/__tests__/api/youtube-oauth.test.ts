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

const mockEncryptToken = jest.fn()
jest.mock('@/lib/youtube-crypto', () => ({
  encryptToken: (...args: unknown[]) => mockEncryptToken(...args),
}))

// Global fetch mock — assigned at module level per testing.md
const mockFetch = jest.fn()
global.fetch = mockFetch

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET as initiateGET } from '@/app/api/auth/youtube/route'
import { GET as callbackGET } from '@/app/api/auth/youtube/callback/route'

// ─── Constants ────────────────────────────────────────────────────────────────

const CLERK_USER_ID = 'user_clerk_abc123'
const USER_UUID = 'deadbeef-dead-beef-dead-beefdeadbeef'

// ─── Env setup ────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.YOUTUBE_CLIENT_ID = 'test-client-id'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.YOUTUBE_CLIENT_SECRET = 'test-secret'
})

beforeEach(() => {
  jest.clearAllMocks()
  // Default: not rate limited
  mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
  // Default: encryptToken returns a stable mock value
  mockEncryptToken.mockReturnValue('encrypted-token')
  // Reset fetch
  mockFetch.mockReset()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInitiateRequest(): NextRequest {
  return new NextRequest('http://localhost/api/auth/youtube', {
    method: 'GET',
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
}

function makeCallbackRequest(params: Record<string, string>): Request {
  const url = new URL('http://localhost/api/auth/youtube/callback')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

// ─── GET /api/auth/youtube (initiate) ────────────────────────────────────────

describe('GET /api/auth/youtube', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 30 })

    const res = await initiateGET(makeInitiateRequest())

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await initiateGET(makeInitiateRequest())

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 302 redirect to Google OAuth URL', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    const res = await initiateGET(makeInitiateRequest())

    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).not.toBeNull()
    expect(location).toContain('accounts.google.com/o/oauth2/v2/auth')
  })

  it('redirect URL includes correct scope, access_type=offline, prompt=consent, state=userId', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    const res = await initiateGET(makeInitiateRequest())

    const location = res.headers.get('location')!
    const redirectUrl = new URL(location)
    expect(redirectUrl.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/youtube.upload')
    expect(redirectUrl.searchParams.get('access_type')).toBe('offline')
    expect(redirectUrl.searchParams.get('prompt')).toBe('consent')
    expect(redirectUrl.searchParams.get('state')).toBe(CLERK_USER_ID)
  })
})

// ─── GET /api/auth/youtube/callback ──────────────────────────────────────────

describe('GET /api/auth/youtube/callback', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 30 })

    const res = await callbackGET(
      makeCallbackRequest({ code: 'auth-code', state: CLERK_USER_ID }) as NextRequest,
    )

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await callbackGET(
      makeCallbackRequest({ code: 'auth-code', state: CLERK_USER_ID }) as NextRequest,
    )

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when code param is missing', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    const res = await callbackGET(
      makeCallbackRequest({ state: CLERK_USER_ID }) as NextRequest,
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing required query params')
  })

  it("returns 400 when state doesn't match authenticated userId", async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    const res = await callbackGET(
      makeCallbackRequest({ code: 'auth-code', state: 'different-user-id' }) as NextRequest,
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('State mismatch — possible CSRF')
  })

  it('returns 502 when Google token exchange fails', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: 'invalid_grant' }),
    })

    const res = await callbackGET(
      makeCallbackRequest({ code: 'bad-code', state: CLERK_USER_ID }) as NextRequest,
    )

    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('Token exchange failed')
  })

  it('returns 302 redirect to /dashboard on success', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: 'ya29.access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.upload',
      }),
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: USER_UUID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'user_youtube_tokens') {
        return {
          upsert: jest.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    })

    const res = await callbackGET(
      makeCallbackRequest({ code: 'valid-code', state: CLERK_USER_ID }) as NextRequest,
    )

    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toBe('http://localhost:3000/dashboard')
  })

  it('calls encryptToken for both access_token and refresh_token before DB write', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: 'ya29.access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.upload',
      }),
    })

    let capturedUpsertArg: Record<string, unknown> | null = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: USER_UUID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'user_youtube_tokens') {
        return {
          upsert: jest.fn().mockImplementation((arg: Record<string, unknown>) => {
            capturedUpsertArg = arg
            return Promise.resolve({ error: null })
          }),
        }
      }
      return {}
    })

    await callbackGET(
      makeCallbackRequest({ code: 'valid-code', state: CLERK_USER_ID }) as NextRequest,
    )

    // encryptToken called twice — once for access_token, once for refresh_token
    expect(mockEncryptToken).toHaveBeenCalledTimes(2)
    expect(mockEncryptToken).toHaveBeenCalledWith('ya29.access-token')
    expect(mockEncryptToken).toHaveBeenCalledWith('refresh-token')

    // The encrypted values (not plaintext) are written to DB
    expect(capturedUpsertArg).not.toBeNull()
    expect(capturedUpsertArg!.access_token).toBe('encrypted-token')
    expect(capturedUpsertArg!.refresh_token).toBe('encrypted-token')
  })
})
