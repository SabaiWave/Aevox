// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFrom = jest.fn()
jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

const mockEncryptToken = jest.fn()
const mockDecryptToken = jest.fn()
jest.mock('@/lib/youtube-crypto', () => ({
  encryptToken: (...args: unknown[]) => mockEncryptToken(...args),
  decryptToken: (...args: unknown[]) => mockDecryptToken(...args),
}))

// Global fetch mock — assigned at module level per testing.md
const mockFetch = jest.fn()
global.fetch = mockFetch

// ─── Import after mocks ───────────────────────────────────────────────────────

import { getValidYouTubeToken } from '@/lib/youtube-token-refresh'

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_UUID = 'deadbeef-dead-beef-dead-beefdeadbeef'

// Token expiry helpers
const futureExpiry = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()
const nearExpiry = () => new Date(Date.now() + 2 * 60 * 1000).toISOString()

// ─── Env setup ────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.YOUTUBE_CLIENT_ID = 'test-client-id'
  process.env.YOUTUBE_CLIENT_SECRET = 'test-secret'
  process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY = '0'.repeat(64)
})

beforeEach(() => {
  jest.clearAllMocks()
  // Re-wire default implementations after clearAllMocks removes them
  mockEncryptToken.mockReturnValue('encrypted')
  mockDecryptToken.mockReturnValue('plaintext-token')
  mockFetch.mockReset()
})

// ─── Helper: wire mockFrom for user_youtube_tokens ───────────────────────────

function wireTokenRow(tokenRow: Record<string, string> | null) {
  mockFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: tokenRow, error: tokenRow ? null : { code: 'PGRST116' } }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  }))
}

// ─── getValidYouTubeToken ─────────────────────────────────────────────────────

describe('getValidYouTubeToken', () => {
  it('returns connected: false when no token row found', async () => {
    wireTokenRow(null)

    const result = await getValidYouTubeToken(USER_UUID)

    expect(result.connected).toBe(false)
    expect(result.accessToken).toBe('')
  })

  it('returns decrypted access token and connected: true when token is valid', async () => {
    wireTokenRow({
      access_token: 'encrypted-access',
      refresh_token: 'encrypted-refresh',
      token_expiry: futureExpiry(),
    })

    const result = await getValidYouTubeToken(USER_UUID)

    expect(result.connected).toBe(true)
    expect(result.accessToken).toBe('plaintext-token')
    expect(mockDecryptToken).toHaveBeenCalledWith('encrypted-access')
  })

  it('does not call fetch when token is valid (not near expiry)', async () => {
    wireTokenRow({
      access_token: 'encrypted-access',
      refresh_token: 'encrypted-refresh',
      token_expiry: futureExpiry(),
    })

    await getValidYouTubeToken(USER_UUID)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls Google refresh endpoint when token expires within 5 min', async () => {
    wireTokenRow({
      access_token: 'encrypted-access',
      refresh_token: 'encrypted-refresh',
      token_expiry: nearExpiry(),
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'new-access-token', expires_in: 3600 }),
    })

    await getValidYouTubeToken(USER_UUID)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns refreshed token after successful refresh', async () => {
    wireTokenRow({
      access_token: 'encrypted-access',
      refresh_token: 'encrypted-refresh',
      token_expiry: nearExpiry(),
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'new-access-token', expires_in: 3600 }),
    })

    const result = await getValidYouTubeToken(USER_UUID)

    expect(result.connected).toBe(true)
    expect(result.accessToken).toBe('new-access-token')
  })

  it('updates DB with re-encrypted token after successful refresh', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              access_token: 'encrypted-access',
              refresh_token: 'encrypted-refresh',
              token_expiry: nearExpiry(),
            },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    }))
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'new-access-token', expires_in: 3600 }),
    })

    await getValidYouTubeToken(USER_UUID)

    expect(mockEncryptToken).toHaveBeenCalledWith('new-access-token')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: 'encrypted' }),
    )
  })

  it('returns existing token as graceful fallback when refresh fetch fails', async () => {
    wireTokenRow({
      access_token: 'encrypted-access',
      refresh_token: 'encrypted-refresh',
      token_expiry: nearExpiry(),
    })
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Unauthorized'),
    })

    const result = await getValidYouTubeToken(USER_UUID)

    expect(result.connected).toBe(true)
    expect(result.accessToken).toBe('plaintext-token')
    expect(mockDecryptToken).toHaveBeenCalledWith('encrypted-access')
  })

  it('does not log token values on refresh failure — console.error contains status only', async () => {
    wireTokenRow({
      access_token: 'encrypted-access',
      refresh_token: 'encrypted-refresh',
      token_expiry: nearExpiry(),
    })
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Server Error'),
    })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await getValidYouTubeToken(USER_UUID)

    expect(consoleSpy).toHaveBeenCalled()
    const loggedArgs = consoleSpy.mock.calls.flat().join(' ')
    expect(loggedArgs).toContain('500')
    expect(loggedArgs).not.toContain('plaintext-token')
    expect(loggedArgs).not.toContain('encrypted-access')
    expect(loggedArgs).not.toContain('encrypted-refresh')

    consoleSpy.mockRestore()
  })
})
