import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit'

// ─── checkRateLimit ───────────────────────────────────────────────────────────
// The Upstash implementation gracefully degrades when UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN are not set — all requests are allowed through.
// Tests cover that degradation contract; actual Redis behaviour is integration-
// tested against a real Upstash instance in CI.

describe('checkRateLimit', () => {
  const config: RateLimitConfig = { windowMs: 60_000, max: 3 }

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('returns limited: false when Upstash env vars are not set (graceful degradation)', async () => {
    const result = await checkRateLimit('test:first-request', config)

    expect(result.limited).toBe(false)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it('always returns limited: false for multiple calls when Upstash is not configured', async () => {
    const key = 'test:within-limit'
    const results = await Promise.all([
      checkRateLimit(key, config),
      checkRateLimit(key, config),
      checkRateLimit(key, config),
      checkRateLimit(key, config), // would exceed max=3 with in-memory limiter
    ])

    for (const result of results) {
      expect(result.limited).toBe(false)
      expect(result.retryAfterSeconds).toBe(0)
    }
  })

  it('returns limited: false for different keys when Upstash is not configured', async () => {
    const key1 = 'test:key1'
    const key2 = 'test:key2'

    const r1 = await checkRateLimit(key1, config)
    const r2 = await checkRateLimit(key2, config)

    expect(r1.limited).toBe(false)
    expect(r2.limited).toBe(false)
  })

  it('returns { limited: false, retryAfterSeconds: 0 } shape on every call', async () => {
    const result = await checkRateLimit('test:shape', { windowMs: 1000, max: 1 })

    expect(result).toHaveProperty('limited')
    expect(result).toHaveProperty('retryAfterSeconds')
    expect(typeof result.limited).toBe('boolean')
    expect(typeof result.retryAfterSeconds).toBe('number')
  })
})
