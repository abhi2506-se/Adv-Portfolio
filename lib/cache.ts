// ─── In-Memory Cache (upgrade to Redis/DB in production) ─────────────────────
import type { ProjectAnalysis } from '@/types/projects'

const CACHE_TTL = 1000 * 60 * 60 // 1 hour

interface CacheEntry {
  data: ProjectAnalysis
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function getCached(key: string): ProjectAnalysis | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return { ...entry.data, cached: true }
}

export function setCached(key: string, data: ProjectAnalysis): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  })
}

export function invalidateCache(key: string): void {
  cache.delete(key)
}

export function getCacheStats() {
  const now = Date.now()
  const valid = [...cache.values()].filter(e => e.expiresAt > now)
  return { total: cache.size, valid: valid.length }
}
