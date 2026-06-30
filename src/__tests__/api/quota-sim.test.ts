// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockInsert = jest.fn()
const mockDeleteEq2 = jest.fn()
const mockDeleteEq1 = jest.fn()
const mockDelete = jest.fn()
const mockCountGte = jest.fn()
const mockCountEq2 = jest.fn()
const mockCountEq1 = jest.fn()
const mockDataGte = jest.fn()
const mockDataEq2 = jest.fn()
const mockDataEq1 = jest.fn()
const mockSingle = jest.fn()
const mockUserEq = jest.fn()
const mockUserSelect = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({ userId: 'user_admin_123' })),
  isApiRoute: jest.fn(() => true),
}))

jest.mock('@/lib/is-admin', () => ({
  isAdmin: jest.fn(() => Promise.resolve(true)),
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

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { POST } from '@/app/api/admin/quota-sim/route'
import { auth, isApiRoute } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { log } from '@/lib/logger'

const mockAuth = auth as unknown as jest.Mock
const mockIsApiRoute = isApiRoute as unknown as jest.Mock
const mockIsAdmin = isAdmin as unknown as jest.Mock
const mockCheckRateLimit = checkRateLimit as jest.Mock
const mockLog = log as { info: jest.Mock; warn: jest.Mock; error: jest.Mock }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/admin/quota-sim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '1.2.3.4',
    },
    body: JSON.stringify(body),
  })
}

// ─── POST /api/admin/quota-sim ────────────────────────────────────────────────

describe('POST /api/admin/quota-sim', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockAuth.mockResolvedValue({ userId: 'user_admin_123' })
    mockIsApiRoute.mockReturnValue(true)
    mockIsAdmin.mockResolvedValue(true)
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
    mockLog.error.mockReturnValue(undefined)

    // users table: .select('id, tier').eq('clerk_id', ...).single()
    mockSingle.mockResolvedValue({ data: { id: 'uuid-user-1', tier: 'starter' }, error: null })
    mockUserEq.mockReturnValue({ single: mockSingle })
    mockUserSelect.mockReturnValue({ eq: mockUserEq })

    // videos count query: .select('id', {count,head}).eq().eq().gte()
    mockCountGte.mockResolvedValue({ count: 0, error: null })
    mockCountEq2.mockReturnValue({ gte: mockCountGte })
    mockCountEq1.mockReturnValue({ eq: mockCountEq2 })

    // videos data query: .select('chars_used').eq().eq().gte()
    mockDataGte.mockResolvedValue({ data: [], error: null })
    mockDataEq2.mockReturnValue({ gte: mockDataGte })
    mockDataEq1.mockReturnValue({ eq: mockDataEq2 })

    // insert
    mockInsert.mockResolvedValue({ error: null })

    // delete chain: .delete({count}).eq('user_id').eq('is_simulated')
    mockDeleteEq2.mockResolvedValue({ count: 3, error: null })
    mockDeleteEq1.mockReturnValue({ eq: mockDeleteEq2 })
    mockDelete.mockReturnValue({ eq: mockDeleteEq1 })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'videos') {
        return {
          select: (col: string, opts?: { count?: string; head?: boolean }) =>
            opts?.count ? { eq: mockCountEq1 } : { eq: mockDataEq1 },
          insert: mockInsert,
          delete: mockDelete,
        }
      }
      return {}
    })
  })

  // ── Auth / Guard ───────────────────────────────────────────────────────────

  it('returns 404 when isApiRoute returns false', async () => {
    mockIsApiRoute.mockReturnValue(false)
    const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })
    const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockIsAdmin.mockResolvedValue(false)
    const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
    expect(res.status).toBe(403)
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 30 })
    const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('returns 400 on invalid action', async () => {
    const res = await POST(makeRequest({ action: 'fill' }) as never)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid request')
  })

  it('returns 400 when body has no action', async () => {
    const res = await POST(makeRequest({}) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 on invalid JSON', async () => {
    const req = new Request('http://localhost/api/admin/quota-sim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: 'not-json',
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid JSON')
  })

  it('returns 404 when user not found in DB', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'No rows' } })
    const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
    expect(res.status).toBe(404)
  })

  // ── fill_videos ────────────────────────────────────────────────────────────

  describe('fill_videos', () => {
    it('inserts rows to reach video cap', async () => {
      mockCountGte.mockResolvedValue({ count: 3, error: null })
      const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(5) // starter cap=8, existing=3
    })

    it('returns count 0 when already at cap', async () => {
      mockCountGte.mockResolvedValue({ count: 8, error: null })
      const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(0)
    })

    it('uses free tier cap of 2 when tier is null', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'uuid-user-1', tier: null }, error: null })
      mockCountGte.mockResolvedValue({ count: 0, error: null })
      const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(2)
    })

    it('returns warning for pro tier', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'uuid-user-1', tier: 'pro' }, error: null })
      const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(0)
      expect(body.warning).toContain('no video cap')
    })

    it('returns 500 on insert error', async () => {
      mockCountGte.mockResolvedValue({ count: 0, error: null })
      mockInsert.mockResolvedValue({ error: { message: 'constraint violation' } })
      const res = await POST(makeRequest({ action: 'fill_videos' }) as never)
      expect(res.status).toBe(500)
      expect(mockLog.error).toHaveBeenCalledTimes(1)
    })
  })

  // ── fill_chars ─────────────────────────────────────────────────────────────

  describe('fill_chars', () => {
    it('inserts one row to exceed char cap', async () => {
      mockDataGte.mockResolvedValue({ data: [], error: null })
      const res = await POST(makeRequest({ action: 'fill_chars' }) as never)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(1)
    })

    it('returns count 0 when chars already exceed cap', async () => {
      mockDataGte.mockResolvedValue({ data: [{ chars_used: 100_001 }], error: null })
      const res = await POST(makeRequest({ action: 'fill_chars' }) as never)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(0)
    })

    it('returns warning for pro tier', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'uuid-user-1', tier: 'pro' }, error: null })
      const res = await POST(makeRequest({ action: 'fill_chars' }) as never)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(0)
      expect(body.warning).toContain('no char cap')
    })

    it('returns 500 on insert error', async () => {
      mockDataGte.mockResolvedValue({ data: [], error: null })
      mockInsert.mockResolvedValue({ error: { message: 'insert failed' } })
      const res = await POST(makeRequest({ action: 'fill_chars' }) as never)
      expect(res.status).toBe(500)
      expect(mockLog.error).toHaveBeenCalledTimes(1)
    })
  })

  // ── clear ──────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('deletes all is_simulated rows for this user', async () => {
      mockDeleteEq2.mockResolvedValue({ count: 6, error: null })
      const res = await POST(makeRequest({ action: 'clear' }) as never)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(6)
    })

    it('returns count 0 when no sim rows exist', async () => {
      mockDeleteEq2.mockResolvedValue({ count: null, error: null })
      const res = await POST(makeRequest({ action: 'clear' }) as never)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.count).toBe(0)
    })

    it('returns 500 on delete error', async () => {
      mockDeleteEq2.mockResolvedValue({ count: null, error: { message: 'delete failed' } })
      const res = await POST(makeRequest({ action: 'clear' }) as never)
      expect(res.status).toBe(500)
      expect(mockLog.error).toHaveBeenCalledTimes(1)
    })
  })
})
