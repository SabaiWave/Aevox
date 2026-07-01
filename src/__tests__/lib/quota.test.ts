// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFrom = jest.fn()
jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { checkVoiceQuota } from '@/lib/quota'

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_UUID = 'deadbeef-dead-beef-dead-beefdeadbeef'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wires mockFrom to resolve with the given rows (or error) for the
 * videos chain: .select('chars_used').eq('user_id').eq('is_dry_run').gte('created_at')
 */
function wireVideos(rows: Array<{ chars_used: number }> | null, error: { message: string } | null = null) {
  const gteChain = jest.fn().mockResolvedValue({ data: rows, error })
  const eqChain2 = jest.fn().mockReturnValue({ gte: gteChain })
  const eqChain1 = jest.fn().mockReturnValue({ eq: eqChain2 })
  const selectChain = jest.fn().mockReturnValue({ eq: eqChain1 })
  mockFrom.mockReturnValue({ select: selectChain })
}

// ─── checkVoiceQuota ─────────────────────────────────────────────────────────

describe('checkVoiceQuota', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── Tier bypass ──────────────────────────────────────────────────────────

  it('pro tier returns allowed immediately without querying DB', async () => {
    const result = await checkVoiceQuota(USER_UUID, 'pro')

    expect(result).toEqual({ allowed: true, used: 0, limit: undefined })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('unknown tier queries DB and applies free-tier cap (fail safe)', async () => {
    wireVideos([{ chars_used: 5000 }])

    const result = await checkVoiceQuota(USER_UUID, 'enterprise')

    expect(result).toEqual({ allowed: true, used: 5000, limit: 10_000 })
    expect(mockFrom).toHaveBeenCalled()
  })

  // ─── Free tier ────────────────────────────────────────────────────────────

  it('free tier under limit returns allowed: true with correct used and limit', async () => {
    wireVideos([{ chars_used:5000 }])

    const result = await checkVoiceQuota(USER_UUID, 'free')

    expect(result).toEqual({ allowed: true, used: 5000, limit: 10_000 })
  })

  it('free tier at limit returns allowed: false', async () => {
    wireVideos([{ chars_used:10_000 }])

    const result = await checkVoiceQuota(USER_UUID, 'free')

    expect(result).toEqual({ allowed: false, used: 10_000, limit: 10_000 })
  })

  it('free tier over limit returns allowed: false', async () => {
    wireVideos([{ chars_used:12_000 }])

    const result = await checkVoiceQuota(USER_UUID, 'free')

    expect(result).toEqual({ allowed: false, used: 12_000, limit: 10_000 })
  })

  // ─── Starter tier ─────────────────────────────────────────────────────────

  it('starter tier under limit returns allowed: true with limit 100000', async () => {
    wireVideos([{ chars_used:50_000 }])

    const result = await checkVoiceQuota(USER_UUID, 'starter')

    expect(result).toEqual({ allowed: true, used: 50_000, limit: 100_000 })
  })

  it('starter tier at limit returns allowed: false', async () => {
    wireVideos([{ chars_used:100_000 }])

    const result = await checkVoiceQuota(USER_UUID, 'starter')

    expect(result).toEqual({ allowed: false, used: 100_000, limit: 100_000 })
  })

  // ─── DB edge cases ────────────────────────────────────────────────────────

  it('empty rows returns allowed: true with used: 0', async () => {
    wireVideos([])

    const result = await checkVoiceQuota(USER_UUID, 'free')

    expect(result).toEqual({ allowed: true, used: 0, limit: 10_000 })
  })

  it('multiple rows are summed correctly', async () => {
    wireVideos([{ chars_used:1000 }, { chars_used:2500 }, { chars_used:3000 }])

    const result = await checkVoiceQuota(USER_UUID, 'free')

    expect(result).toEqual({ allowed: true, used: 6500, limit: 10_000 })
  })

  it('null data is treated as empty — returns allowed: true with used: 0', async () => {
    wireVideos(null)

    const result = await checkVoiceQuota(USER_UUID, 'free')

    expect(result).toEqual({ allowed: true, used: 0, limit: 10_000 })
  })

  // ─── Error handling ───────────────────────────────────────────────────────

  it('Supabase error returns fail-open: allowed: true with used: 0 and cap', async () => {
    wireVideos(null, { message: 'connection refused' })

    const result = await checkVoiceQuota(USER_UUID, 'free')

    expect(result).toEqual({ allowed: true, used: 0, limit: 10_000 })
  })

  it('Supabase error on starter tier uses starter cap in fail-open result', async () => {
    wireVideos(null, { message: 'timeout' })

    const result = await checkVoiceQuota(USER_UUID, 'starter')

    expect(result).toEqual({ allowed: true, used: 0, limit: 100_000 })
  })

  it('DB throws returns fail-open: allowed: true with used: 0 and cap', async () => {
    const gteChain = jest.fn().mockRejectedValue(new Error('unexpected DB crash'))
    const eqChain2 = jest.fn().mockReturnValue({ gte: gteChain })
    const eqChain1 = jest.fn().mockReturnValue({ eq: eqChain2 })
    const selectChain = jest.fn().mockReturnValue({ eq: eqChain1 })
    mockFrom.mockReturnValue({ select: selectChain })

    const result = await checkVoiceQuota(USER_UUID, 'free')

    expect(result).toEqual({ allowed: true, used: 0, limit: 10_000 })
  })
})
