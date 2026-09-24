'use client'

/**
 * VisitorAnalytics — real-time visitor counter + admin last-updated timestamp.
 *
 * • Records the current browser session on mount via POST /api/visitors.
 * • Polls GET /api/visitors every 30 seconds so active/total stay fresh.
 * • "Last Updated" = WHEN ADMIN LAST SAVED portfolio data — not page-load time.
 * • Duplicate prevention: one UUID per browser tab (sessionStorage).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Radio, TrendingUp, RefreshCw, Calendar } from 'lucide-react'

const POLL_MS = 30_000

interface VisitorStats { total: number; active: number; lastUpdated: number }

function getOrCreateSessionId(): string {
  const KEY = 'portfolio_visitor_sid'
  try {
    let sid = sessionStorage.getItem(KEY)
    if (!sid) { sid = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`; sessionStorage.setItem(KEY, sid) }
    return sid
  } catch { return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}` }
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const fromRef  = useRef(0)
  useEffect(() => {
    fromRef.current  = displayed
    startRef.current = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - startRef.current) / 900, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplayed(Math.round(fromRef.current + (value - fromRef.current) * e))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span className={className}>{displayed.toLocaleString()}</span>
}

function Skeleton({ className }: { className?: string }) {
  return <span className={`inline-block rounded-md bg-secondary animate-pulse ${className}`} />
}

function formatAdminTs(ts: number | null) {
  if (!ts) return { date: null, time: null }
  const d = new Date(ts)
  return {
    date: d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}

export function VisitorAnalytics() {
  const [stats,          setStats]          = useState<VisitorStats | null>(null)
  const [adminUpdatedAt, setAdminUpdatedAt] = useState<number | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(false)

  const fetchAdminUpdated = useCallback(async () => {
    try {
      const res  = await fetch('/api/portfolio', { cache: 'no-store' })
      const data = await res.json()
      if (data?._updatedAt) setAdminUpdatedAt(Number(data._updatedAt))
    } catch {}
  }, [])

  const recordAndFetch = useCallback(async () => {
    try {
      const res  = await fetch('/api/visitors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getOrCreateSessionId(),
          page: typeof window !== 'undefined' ? window.location.pathname : '/',
        }),
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('bad')
      setStats(await res.json()); setError(false)
    } catch { setError(true) } finally { setLoading(false) }
  }, [])

  const pollStats = useCallback(async () => {
    try { const res = await fetch('/api/visitors', { cache: 'no-store' }); setStats(await res.json()) } catch {}
  }, [])

  useEffect(() => {
    recordAndFetch(); fetchAdminUpdated()
    const v = setInterval(pollStats, POLL_MS)
    const a = setInterval(fetchAdminUpdated, 60_000)
    return () => { clearInterval(v); clearInterval(a) }
  }, [recordAndFetch, fetchAdminUpdated, pollStats])

  const { date: adminDate, time: adminTime } = formatAdminTs(adminUpdatedAt)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Live Visitor Analytics</h3>
            <p className="text-xs text-muted-foreground">Real-time · updates every 30 s</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground
                        bg-secondary/60 border border-border/50 rounded-full px-3 py-1">
          <RefreshCw className="w-2.5 h-2.5 animate-spin [animation-duration:4s]" />Live
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users className="w-5 h-5"/>} label="Total Visitors" sublabel="All time"
          value={stats?.total ?? null} loading={loading} error={error} accent="blue" />
        <StatCard icon={<Radio className="w-5 h-5"/>} label="Active Now" sublabel="Last 5 minutes"
          value={stats?.active ?? null} loading={loading} error={error} accent="green" pulse />

        {/* Admin last-updated — shows date & time of admin's save action */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60
                        bg-secondary/30 backdrop-blur-sm p-5 flex flex-col gap-2
                        hover:border-border/80 transition-colors">
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-purple-500/8 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Calendar className="w-4 h-4" />
            </span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Last Updated</span>
          </div>
          {loading ? (
            <><Skeleton className="w-28 h-5 mt-1" /><Skeleton className="w-20 h-4" /></>
          ) : adminTime ? (
            <AnimatePresence mode="wait">
              <motion.div key={adminUpdatedAt} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1">
                <p className="text-base font-bold text-purple-400 leading-tight tabular-nums">{adminTime}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{adminDate}</p>
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="text-sm text-muted-foreground mt-1 italic">Not yet saved</p>
          )}
          <p className="text-xs text-muted-foreground/60">By admin · portfolio data</p>
        </div>
      </div>
    </motion.div>
  )
}

const ACCENT = {
  blue:  { bg: 'bg-blue-500/10',  text: 'text-blue-400',  glow: 'bg-blue-500/8',  dot: 'bg-blue-500'  },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', glow: 'bg-green-500/8', dot: 'bg-green-500' },
}

interface StatCardProps {
  icon: React.ReactNode; label: string; sublabel: string
  value: number | null; loading: boolean; error: boolean
  accent: 'blue' | 'green'; pulse?: boolean
}

function StatCard({ icon, label, sublabel, value, loading, error, accent, pulse }: StatCardProps) {
  const a = ACCENT[accent]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60
                    bg-secondary/30 backdrop-blur-sm p-5 flex flex-col gap-2
                    hover:border-border/80 transition-colors group">
      <div className={`absolute -bottom-4 -right-4 w-20 h-20 ${a.glow} rounded-full blur-xl pointer-events-none`} />
      <div className="flex items-center gap-2">
        <span className={`p-1.5 rounded-lg ${a.bg} ${a.text}`}>{icon}</span>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        {pulse && !loading && !error && (value ?? 0) > 0 && (
          <span className="relative flex h-2 w-2 ml-auto flex-shrink-0">
            <span className={`absolute inline-flex h-full w-full rounded-full ${a.dot} opacity-75 animate-ping`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${a.dot}`} />
          </span>
        )}
      </div>
      <AnimatePresence mode="wait">
        {loading ? <Skeleton className="w-20 h-8 mt-1" />
         : error  ? <p className="text-sm font-medium text-muted-foreground mt-1">—</p>
         : <motion.p key={value} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
             className={`text-3xl font-extrabold ${a.text} leading-none mt-1 tabular-nums`}>
             <AnimatedNumber value={value ?? 0} />
           </motion.p>}
      </AnimatePresence>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  )
}
