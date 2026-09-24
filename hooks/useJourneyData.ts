'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getBlogs, getCertificates, type BlogPost, type Certificate } from '@/lib/journey-store'

// Simple in-memory cache so re-renders & re-mounts don't re-fetch
let _cache: { blogs: BlogPost[]; certificates: Certificate[]; ts: number } | null = null
const CACHE_TTL = 30_000 // 30s

export function useJourneyData() {
  const [blogs, setBlogs] = useState<BlogPost[]>(_cache?.blogs ?? [])
  const [certificates, setCertificates] = useState<Certificate[]>(_cache?.certificates ?? [])
  const [loading, setLoading] = useState(!_cache)
  const fetchingRef = useRef(false)

  const refresh = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && _cache && now - _cache.ts < CACHE_TTL) {
      setBlogs(_cache.blogs)
      setCertificates(_cache.certificates)
      setLoading(false)
      return
    }
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const [b, c] = await Promise.all([getBlogs(), getCertificates()])
      _cache = { blogs: b, certificates: c, ts: Date.now() }
      setBlogs(b)
      setCertificates(c)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    refresh()
    const onUpdate = () => { _cache = null; refresh(true) }
    window.addEventListener('journey-data-updated', onUpdate)
    return () => window.removeEventListener('journey-data-updated', onUpdate)
  }, [refresh])

  return { blogs, certificates, loading, refresh: () => refresh(true) }
}
