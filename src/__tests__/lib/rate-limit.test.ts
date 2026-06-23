import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit'

// ─── checkRateLimit ───────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  const config: RateLimitConfig = { windowMs: 60_000, max: 3 }

  beforeEach(() => {
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('first request returns limited: false', () => {
    const result = checkRateLimit('test:first-request', config)

    expect(result.limited).toBe(false)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it('requests within limit all return limited: false', () => {
    const key = 'test:within-limit'
    const results = [
      checkRateLimit(key, config),
      checkRateLimit(key, config),
      checkRateLimit(key, config),
    ]

    for (const result of results) {
      expect(result.limited).toBe(false)
      expect(result.retryAfterSeconds).toBe(0)
    }
  })

  it('request exceeding max returns limited: true with positive retryAfterSeconds', () => {
    const key = 'test:over-limit'
    // Exhaust the limit (max: 3)
    checkRateLimit(key, config)
    checkRateLimit(key, config)
    checkRateLimit(key, config)

    // 4th request exceeds max
    const result = checkRateLimit(key, config)

    expect(result.limited).toBe(true)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('counter resets after window expires and request succeeds again', () => {
    jest.useFakeTimers()
    const key = 'test:window-reset'
    const windowMs = 5_000
    const shortConfig: RateLimitConfig = { windowMs, max: 2 }

    const t0 = Date.now()
    jest.setSystemTime(t0)

    // Exhaust the limit
    checkRateLimit(key, shortConfig)
    checkRateLimit(key, shortConfig)

    // Still limited
    const limited = checkRateLimit(key, shortConfig)
    expect(limited.limited).toBe(true)

    // Advance past the window
    jest.setSystemTime(t0 + windowMs + 1)

    // Window has expired — counter should reset
    const afterReset = checkRateLimit(key, shortConfig)
    expect(afterReset.limited).toBe(false)
    expect(afterReset.retryAfterSeconds).toBe(0)
  })

  it('different keys are tracked independently', () => {
    const sharedConfig: RateLimitConfig = { windowMs: 60_000, max: 2 }
    const key1 = 'test:independent:key1'
    const key2 = 'test:independent:key2'

    // Exhaust key1
    checkRateLimit(key1, sharedConfig)
    checkRateLimit(key1, sharedConfig)
    const key1Limited = checkRateLimit(key1, sharedConfig)
    expect(key1Limited.limited).toBe(true)

    // key2 should be unaffected
    const key2Result = checkRateLimit(key2, sharedConfig)
    expect(key2Result.limited).toBe(false)
    expect(key2Result.retryAfterSeconds).toBe(0)
  })
})
