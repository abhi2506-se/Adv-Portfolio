import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

let redisLimiterCache = new Map<string, Ratelimit>()

function getRedisLimiter(key: string, limit: number, windowSeconds: number): Ratelimit {
  const cacheKey = `${key}:${limit}:${windowSeconds}`
  let limiter = redisLimiterCache.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `portal:ratelimit:${key}`,
    })
    redisLimiterCache.set(cacheKey, limiter)
  }
  return limiter
}

// In-memory fallback — ONLY correct for a single server instance. Used
// automatically in local dev when Upstash env vars aren't set, so the
// feature still works without extra setup, but production on Vercel
// (multiple serverless instances, cold starts) needs real Upstash env vars
// or this limit is effectively per-instance, not global. See
// CLIENT_PORTAL_SETUP.md step 8.
const memoryStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Returns true if the caller identified by `identifier` has exceeded
 * `limit` requests within `windowSeconds`, scoped under `bucket` (e.g.
 * "login", "register", "2fa-verify"). Always fails OPEN on Upstash errors
 * (network blip) rather than locking everyone out — logs a warning so it's
 * visible in your server logs if that starts happening a lot.
 */
export async function isRateLimited(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  if (hasUpstash) {
    try {
      const limiter = getRedisLimiter(bucket, limit, windowSeconds)
      const result = await limiter.limit(identifier)
      return !result.success
    } catch (err) {
      console.warn(`[ratelimit] Upstash error for bucket=${bucket}, failing open`, err)
      return false
    }
  }

  // In-memory fallback
  const key = `${bucket}:${identifier}`
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return false
  }
  entry.count += 1
  return entry.count > limit
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}
