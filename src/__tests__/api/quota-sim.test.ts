// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockInsert = jest.fn()
const mockDelete = jest.fn()
const mockDeleteEq = jest.fn()
const mockSelectCount = jest.fn()
const mockSelectCountEq = jest.fn()
const mockSelectCountEqGte = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
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

function makeRequest(body: Record<string, unknown> = { action: 'fill' }): Request {
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

    // Re-establish defaults after clearAllMocks removes implementations
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' })
    mockIsApiRoute.mockReturnValue(true)
    mockIsAdmin.mockResolvedValue(true)
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
    mockLog.error.mockResolvedValue(undefined)

    // Default users table lookup chain: from('users').select('id, tier').eq(...).single()
    mockSingle.mockResolvedValue({
      data: { id: 'uuid-user-1', tier: 'starter' },
      error: null,
    })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })

    // Default count chain: from('usage_logs').select('id', { count, head }).eq(...).eq(...).gte(...)
    mockSelectCountEqGte.mockResolvedValue({ count: 0, error: null })
    mockSelectCountEq.mockReturnValue({ gte: mockSelectCountEqGte })
    mockSelectCountEq.mockImplementation(() => ({ gte: mockSelectCountEqGte, eq: mockSelectCountEq }))
    mockSelectCount.mockReturnValue({ eq: mockSelectCountEq })

    // Default insert chain: from('usage_logs').insert(rows)
    mockInsert.mockResolvedValue({ error: null })

    // Default delete chain: from('usage_logs').delete({ count }).eq(...).eq(...)
    mockDeleteEq.mockResolvedValue({ count: 3, error: null })
    mockDelete.mockReturnValue({ eq: jest.fn(() => ({ eq: mockDeleteEq })) })

    // Route `from` dispatcher
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return { select: mockSelect }
      if (table === 'usage_logs')
        return {
          select: mockSelectCount,
          insert: mockInsert,
          delete: mockDelete,
        }
      return {}
    })
  })

  // ── Auth / Guard ───────────────────────────────────────────────────────────

  it('returns 404 when isApiRoute returns false', async () => {
    mockIsApiRoute.mockReturnValue(false)

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when authenticated but not admin', async () => {
    mockIsAdmin.mockResolvedValue(false)

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 30 })

    const req = makeRequest()
    const res = await POST(req as never)

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  it('returns 400 on invalid action', async () => {
    const req = makeRequest({ action: 'nuke' })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
  })

  it('returns 400 when body is missing action entirely', async () => {
    const req = makeRequest({})
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
  })

  it('returns 400 when body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/admin/quota-sim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: 'not-json',
    })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid JSON')
  })

  // ── User lookup ────────────────────────────────────────────────────────────

  it('returns 404 when user is not found in DB', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'No rows' } })

    const req = makeRequest({ action: 'fill' })
    const res = await POST(req as never)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('User not found')
  })

  // ── Fill action ────────────────────────────────────────────────────────────

  it('fill: returns 200 with { success: true, count: N } when rows inserted', async () => {
    // starter tier cap = 8, existing = 3 → toInsert = 5
    mockSelectCountEqGte.mockResolvedValue({ count: 3, error: null })
    mockInsert.mockResolvedValue({ error: null })

    const req = makeRequest({ action: 'fill' })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(5)
  })

  it('fill: returns 200 with { success: true, count: 0 } when already at cap', async () => {
    // starter tier cap = 8, existing = 8 → toInsert = 0
    mockSelectCountEqGte.mockResolvedValue({ count: 8, error: null })

    const req = makeRequest({ action: 'fill' })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(0)
  })

  it('fill: uses free tier cap of 2 when user has no tier set', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'uuid-user-1', tier: null }, error: null })
    // existing = 0 → toInsert = 2
    mockSelectCountEqGte.mockResolvedValue({ count: 0, error: null })
    mockInsert.mockResolvedValue({ error: null })

    const req = makeRequest({ action: 'fill' })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(2)
  })

  it('fill: returns 500 on Supabase insert error', async () => {
    mockSelectCountEqGte.mockResolvedValue({ count: 0, error: null })
    mockInsert.mockResolvedValue({ error: { message: 'insert constraint violation' } })

    const req = makeRequest({ action: 'fill' })
    const res = await POST(req as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Insert failed')
    expect(mockLog.error).toHaveBeenCalledTimes(1)
    expect(mockLog.error.mock.calls[0][0]).toContain('[quota-sim]')
  })

  // ── Clear action ───────────────────────────────────────────────────────────

  it('clear: returns 200 with { success: true, count: N } when rows deleted', async () => {
    mockDeleteEq.mockResolvedValue({ count: 4, error: null })

    const req = makeRequest({ action: 'clear' })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(4)
  })

  it('clear: returns 200 with count 0 when no simulated rows exist', async () => {
    mockDeleteEq.mockResolvedValue({ count: null, error: null })

    const req = makeRequest({ action: 'clear' })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(0)
  })

  it('clear: returns 500 on Supabase delete error', async () => {
    mockDeleteEq.mockResolvedValue({ count: null, error: { message: 'delete failed' } })

    const req = makeRequest({ action: 'clear' })
    const res = await POST(req as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Delete failed')
    expect(mockLog.error).toHaveBeenCalledTimes(1)
    expect(mockLog.error.mock.calls[0][0]).toContain('[quota-sim]')
  })
})
