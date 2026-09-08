'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchPortfolioData, defaultPortfolioData, type PortfolioData } from '@/lib/portfolio-data'

/**
 * usePortfolioData
 * Fetches portfolio data from the Neon database via API on every mount.
 * This ensures ALL devices always see the latest saved data.
 * Refreshes when the admin saves (custom event from savePortfolioData).
 */
export function usePortfolioData(): PortfolioData {
  const [data, setData] = useState<PortfolioData>(defaultPortfolioData)

  const refresh = useCallback(async () => {
    const d = await fetchPortfolioData()
    setData(d)
  }, [])

  useEffect(() => {
    refresh()
    // Re-fetch when admin saves in same tab
    window.addEventListener('portfolio-data-updated', refresh)
    // Poll every 30s so other devices get updates without hard refresh
    const interval = setInterval(refresh, 30_000)
    return () => {
      window.removeEventListener('portfolio-data-updated', refresh)
      clearInterval(interval)
    }
  }, [refresh])

  return data
}
