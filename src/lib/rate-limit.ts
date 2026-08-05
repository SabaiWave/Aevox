import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export interface RateLimitConfig {
  windowMs: number
  max: number
}

// One Ratelimit instance per (windowMs, max) combo — lazy cache
const limiters = new Map<string, Ratelimit>()

function getLimiter(config: RateLimitConfig): Ratelimit {
  const cacheKey = `${config.windowMs}:${config.max}`
  if (!limiters.has(cacheKey)) {
    limiters.set(cacheKey, new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(config.max, `${config.windowMs} ms`),
    }))
  }
  return limiters.get(cacheKey)!
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Upstash not configured — allow all (graceful degradation for local dev)
    return { limited: false, retryAfterSeconds: 0 }
  }

  try {
    const limiter = getLimiter(config)
    const { success, reset } = await limiter.limit(key)
    if (!success) {
      const retryAfterMs = reset - Date.now()
      return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
    }
    return { limited: false, retryAfterSeconds: 0 }
  } catch {
    // Redis unavailable — fail open to avoid blocking real users
    return { limited: false, retryAfterSeconds: 0 }
  }
}
