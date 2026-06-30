// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdateEq = jest.fn()
const mockUpdate = jest.fn()
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

import { POST } from '@/app/api/admin/support-notes/route'
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

const VALID_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const VALID_NOTES = 'User reported billing issue on 2026-06-30.'

function makeRequest(body: Record<string, unknown> = { userId: VALID_USER_ID, notes: VALID_NOTES }): Request {
  return new Request('http://localhost/api/admin/support-notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '1.2.3.4',
    },
    body: JSON.stringify(body),
  })
}

// ─── POST /api/admin/support-notes ───────────────────────────────────────────

describe('POST /api/admin/support-notes', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Re-establish defaults after clearAllMocks removes implementations
    mockAuth.mockResolvedValue({ userId: 'user_admin_123' })
    mockIsApiRoute.mockReturnValue(true)
    mockIsAdmin.mockResolvedValue(true)
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })

    // Default update chain: from('users').update({ support_notes }).eq('id', targetUserId)
    mockUpdateEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockFrom.mockReturnValue({ update: mockUpdate })
  })

  // ── Auth / Guard ───────────────────────────────────────────────────────────

  it('returns 404 when isApiRoute returns false', async () => {
    mockIsApiRoute.mockReturnValue(false)

    const res = await POST(makeRequest() as never)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await POST(makeRequest() as never)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when authenticated but not admin', async () => {
    mockIsAdmin.mockResolvedValue(false)

    const res = await POST(makeRequest() as never)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 30 })

    const res = await POST(makeRequest() as never)

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  it('returns 400 when userId is missing', async () => {
    const res = await POST(makeRequest({ notes: VALID_NOTES }) as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
  })

  it('returns 400 when userId is not a valid UUID', async () => {
    const res = await POST(makeRequest({ userId: 'not-a-uuid', notes: VALID_NOTES }) as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
  })

  it('returns 400 when notes exceed 2000 characters', async () => {
    const tooLong = 'x'.repeat(2001)
    const res = await POST(makeRequest({ userId: VALID_USER_ID, notes: tooLong }) as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
  })

  it('returns 400 when notes field is missing', async () => {
    const res = await POST(makeRequest({ userId: VALID_USER_ID }) as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
  })

  it('returns 400 when body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/admin/support-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: 'not-json',
    })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid JSON')
  })

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns 200 { success: true } on successful save', async () => {
    const res = await POST(makeRequest() as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true })
  })

  it('calls Supabase update with correct targetUserId and notes', async () => {
    await POST(makeRequest() as never)

    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockUpdate).toHaveBeenCalledWith({ support_notes: VALID_NOTES })
    expect(mockUpdateEq).toHaveBeenCalledWith('id', VALID_USER_ID)
  })

  it('accepts notes at exactly 2000 characters', async () => {
    const maxNotes = 'a'.repeat(2000)
    const res = await POST(makeRequest({ userId: VALID_USER_ID, notes: maxNotes }) as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({ support_notes: maxNotes })
  })

  // ── Notes content not logged ───────────────────────────────────────────────

  it('does not log notes content on success', async () => {
    const sensitiveNotes = 'SECRET: user threatened legal action'
    await POST(makeRequest({ userId: VALID_USER_ID, notes: sensitiveNotes }) as never)

    const allLogCalls = [
      ...mockLog.info.mock.calls,
      ...mockLog.warn.mock.calls,
      ...mockLog.error.mock.calls,
    ]
    const loggedStrings = allLogCalls.flat().map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg),
    )
    for (const s of loggedStrings) {
      expect(s).not.toContain(sensitiveNotes)
    }
  })

  it('does not log notes content on update failure', async () => {
    const sensitiveNotes = 'CONFIDENTIAL: payment dispute pending'
    mockUpdateEq.mockResolvedValue({ error: { message: 'constraint violation' } })

    await POST(makeRequest({ userId: VALID_USER_ID, notes: sensitiveNotes }) as never)

    const allLogCalls = [
      ...mockLog.info.mock.calls,
      ...mockLog.warn.mock.calls,
      ...mockLog.error.mock.calls,
    ]
    const loggedStrings = allLogCalls.flat().map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg),
    )
    for (const s of loggedStrings) {
      expect(s).not.toContain(sensitiveNotes)
    }
  })

  // ── Error path ─────────────────────────────────────────────────────────────

  it('returns 500 when Supabase update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'db constraint violation' } })

    const res = await POST(makeRequest() as never)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Update failed')
    expect(mockLog.error).toHaveBeenCalledTimes(1)
    expect(mockLog.error.mock.calls[0][0]).toContain('[support-notes]')
  })
})
