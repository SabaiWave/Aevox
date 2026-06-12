// In-memory sliding-window rate limiter. MVP approach per api.md.
// Replace with Upstash/Redis in Phase 5 for multi-instance production.

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  windowMs: number  // window size in milliseconds
  max: number       // max requests per window
}

export function checkRateLimit(key: string, config: RateLimitConfig): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= config.windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { limited: false, retryAfterSeconds: 0 }
  }

  if (entry.count >= config.max) {
    const retryAfterMs = config.windowMs - (now - entry.windowStart)
    return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }
  }

  entry.count++
  return { limited: false, retryAfterSeconds: 0 }
}
