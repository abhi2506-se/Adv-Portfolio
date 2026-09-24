'use client'

/**
 * PowerBI-style Live Analytics Dashboard
 * Shows between Live Visitor Analysis and Get In Touch form.
 * All data fetched from real DB (visitor_sessions table).
 * - Light/dark theme-safe: uses CSS variables for all text/stroke colours.
 * - Adds "Website Last Updated" KPI card (fetched from /api/portfolio).
 * - Polls every 30 s; per-second countdown badge shows next refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import {
  Monitor, Smartphone, Tablet, Globe, MapPin, Activity,
  Users, Wifi, RefreshCw, TrendingUp, Clock, CalendarClock,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface VisitorAnalyticsData {
  total: number
  active: number
  monthly: number
  countries: { name: string; count: number }[]
  devices:   { name: string; count: number }[]
  os:        { name: string; count: number }[]
  liveVisitors: {
    id: string; city: string; country: string
    device: string; os: string; browser: string
    page: string; seenAgo: number
  }[]
  dailyTrend: { day: string; count: number }[]
  fetchedAt: number
}

// ─── Session helper ───────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  const KEY = 'portfolio_visitor_sid'
  try {
    let sid = sessionStorage.getItem(KEY)
    if (!sid) {
      sid = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      sessionStorage.setItem(KEY, sid)
    }
    return sid
  } catch {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_MS = 5_000

const DEVICE_ICONS: Record<string, React.ElementType> = {
  Mobile: Smartphone, Tablet, Desktop: Monitor,
}

const OS_COLORS: Record<string, string> = {
  Windows: '#0078d4', macOS: '#888888', iOS: '#6b7280',
  Android: '#78c257', Linux: '#f7b731', Unknown: '#94a3b8',
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeenAgo(secs: number): string {
  if (secs < 60)  return `${secs}s ago`
  const m = Math.floor(secs / 60)
  if (m  < 60)    return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function formatDay(day: string): string {
  try { return new Date(day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) }
  catch { return day }
}

function formatTs(ts: number | null) {
  if (!ts) return { date: null, time: null }
  const d = new Date(ts)
  return {
    date: d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}

// ─── Theme-aware chart style helpers ─────────────────────────────────────────
// We read actual CSS variable values at render time so charts work in both themes.

function useChartColors() {
  // Returns colours derived from current CSS variables
  // We default to values that work in both themes via opacity
  return {
    gridStroke:   'hsl(var(--border))',
    axisColor:    'hsl(var(--muted-foreground))',
    tooltipBg:    'hsl(var(--card))',
    tooltipBorder:'hsl(var(--border))',
    tooltipText:  'hsl(var(--card-foreground))',
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBadge({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: number | string; color: string; sub?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 dark:bg-secondary/30 backdrop-blur-sm p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-lg" style={{ background: `${color}22` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-2xl font-extrabold tabular-nums" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
    </div>
  )
}

function LastUpdatedCard({ ts, loading }: { ts: number | null; loading: boolean }) {
  const { date, time } = formatTs(ts)
  return (
    <div className="relative overflow-hidden flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 dark:bg-secondary/30 backdrop-blur-sm p-4 shadow-sm">
      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-purple-500/8 rounded-full blur-xl pointer-events-none" />
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-purple-500/15">
          <CalendarClock className="w-4 h-4 text-purple-500" />
        </span>
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Website Updated</span>
      </div>
      {loading ? (
        <div className="h-8 w-28 mt-1 rounded bg-secondary animate-pulse" />
      ) : time ? (
        <AnimatePresence mode="wait">
          <motion.div key={ts} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-0.5">
            <p className="text-2xl font-extrabold tabular-nums text-purple-500 leading-none">{time}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{date} · by admin</p>
          </motion.div>
        </AnimatePresence>
      ) : (
        <p className="text-sm text-muted-foreground italic mt-1">Not yet saved</p>
      )}
    </div>
  )
}

// Countdown badge
function NextRefreshBadge({ nextIn }: { nextIn: number }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/60 border border-border/50 rounded-full px-2.5 py-1">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
      </span>
      Refreshes in {nextIn}s
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PowerBIDashboard() {
  const [data,         setData]         = useState<VisitorAnalyticsData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [adminTs,      setAdminTs]      = useState<number | null>(null)
  const [adminLoading, setAdminLoading] = useState(true)
  const [countdown,    setCountdown]    = useState(POLL_MS / 1000)
  const lastFetchRef   = useRef<number>(Date.now())

  const chart = useChartColors()

  // Register this browser session so this visitor is counted as active
  const registerSession = useCallback(async () => {
    try {
      await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getOrCreateSessionId(),
          page: typeof window !== 'undefined' ? window.location.pathname : '/',
        }),
        cache: 'no-store',
      })
    } catch {}
  }, [])

  // Fetch visitor analytics
  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const res = await fetch('/api/visitor-analytics', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch {} finally {
      setLoading(false)
      lastFetchRef.current = Date.now()
      setCountdown(POLL_MS / 1000)
    }
  }, [])

  // Fetch admin last-updated timestamp
  const fetchAdmin = useCallback(async () => {
    setAdminLoading(true)
    try {
      const res = await fetch('/api/portfolio', { cache: 'no-store' })
      const d   = await res.json()
      if (d?._updatedAt) setAdminTs(Number(d._updatedAt))
    } catch {} finally { setAdminLoading(false) }
  }, [])

  // On mount: register session + load data.
  // Poll analytics every 5 s; keep session alive every 60 s; countdown every 1 s.
  useEffect(() => {
    registerSession()
    fetchData(false)
    fetchAdmin()
    const dataIv    = setInterval(() => fetchData(false), POLL_MS)
    // Heartbeat: keep last_active fresh so this visitor shows as "online now"
    const sessionIv = setInterval(registerSession, 60_000)
    const adminIv   = setInterval(fetchAdmin, 60_000)
    const cdIv      = setInterval(() => {
      setCountdown(Math.max(0, Math.round((lastFetchRef.current + POLL_MS - Date.now()) / 1000)))
    }, 1_000)
    return () => { clearInterval(dataIv); clearInterval(sessionIv); clearInterval(adminIv); clearInterval(cdIv) }
  }, [fetchData, fetchAdmin, registerSession])

  // Tooltip shared style (theme-aware)
  const tooltipStyle = {
    contentStyle: {
      background: chart.tooltipBg,
      border: `1px solid ${chart.tooltipBorder}`,
      borderRadius: 8,
      fontSize: 12,
      color: chart.tooltipText,
    },
    labelStyle: { color: chart.tooltipText },
    itemStyle:  { color: chart.tooltipText },
    cursor:     { fill: 'hsl(var(--muted)/0.2)' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
      className="w-full space-y-5"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Live Analytics Dashboard</h3>
            <p className="text-xs text-muted-foreground">Real-time visitor insights · refreshes every 5s</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NextRefreshBadge nextIn={countdown} />
          <button
            onClick={() => { fetchData(true); fetchAdmin() }}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground
                       bg-secondary/60 border border-border/50 rounded-full px-3 py-1.5 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="h-48 rounded-2xl border border-border/40 bg-secondary/20 animate-pulse flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading live data…</p>
        </div>
      ) : data ? (
        <>
          {/* ── KPI Row (now 5 cards including Website Updated) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatBadge icon={Users}      label="Total Visitors" value={data.total}   color="#3b82f6" sub="All time" />
            <StatBadge icon={Wifi}       label="Active Now"     value={data.active}  color="#10b981" sub="Last 5 min" />
            <StatBadge icon={TrendingUp} label="This Month"     value={data.monthly} color="#8b5cf6" sub="Last 30 days" />
            <StatBadge icon={Clock}      label="Live Feed"      value={`${data.liveVisitors.length} users`} color="#f59e0b" sub="Last 10 min" />
            <LastUpdatedCard ts={adminTs} loading={adminLoading} />
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Daily Trend */}
            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/60 dark:bg-secondary/20 p-5 shadow-sm">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Daily Visitors (Last 7 Days)
              </h4>
              {data.dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data.dailyTrend.map(d => ({ ...d, day: formatDay(d.day) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle.contentStyle}
                      labelStyle={tooltipStyle.labelStyle}
                      itemStyle={tooltipStyle.itemStyle}
                      cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      name="Visitors"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                  Collecting data…
                </div>
              )}
            </div>

            {/* Devices */}
            <div className="rounded-2xl border border-border/60 bg-card/60 dark:bg-secondary/20 p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Devices</h4>
              {data.devices.length > 0 ? (
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie
                      data={data.devices} dataKey="count" nameKey="name"
                      cx="50%" cy="50%" outerRadius={44} innerRadius={24}
                    >
                      {data.devices.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">No data yet</div>
              )}
              <div className="space-y-2">
                {data.devices.slice(0, 3).map((d, i) => {
                  const Icon = DEVICE_ICONS[d.name] || Monitor
                  const pct  = data.total > 0 ? Math.round((d.count / data.total) * 100) : 0
                  const col  = CHART_COLORS[i % CHART_COLORS.length]
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span className="flex-1 text-muted-foreground">{d.name}</span>
                      <span className="font-mono font-semibold text-foreground">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Countries + Live Feed ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Countries */}
            <div className="rounded-2xl border border-border/60 bg-card/60 dark:bg-secondary/20 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Countries</h4>
              </div>
              {data.countries.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={data.countries.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name" type="category"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false} tickLine={false}
                      width={72}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle.contentStyle}
                      labelStyle={tooltipStyle.labelStyle}
                      itemStyle={tooltipStyle.itemStyle}
                      cursor={{ fill: 'hsl(var(--muted)/0.15)' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Visitors" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-36 flex items-center justify-center text-xs text-muted-foreground">Collecting data…</div>
              )}
            </div>

            {/* Live Visitor Feed */}
            <div className="rounded-2xl border border-border/60 bg-card/60 dark:bg-secondary/20 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Visitor Feed</h4>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-none">
                <AnimatePresence>
                  {data.liveVisitors.length > 0 ? data.liveVisitors.map((v) => {
                    const DevIcon = DEVICE_ICONS[v.device] || Monitor
                    return (
                      <motion.div
                        key={v.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-[11px] py-2 border-b border-border/30 last:border-0"
                      >
                        <DevIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                        <span className="text-foreground/80 flex-1 truncate font-medium">
                          {v.city ? `${v.city}, ` : ''}{v.country || 'Unknown'}
                        </span>
                        <span className="text-muted-foreground font-mono shrink-0">{v.os}</span>
                        <span className="text-muted-foreground/50 shrink-0 tabular-nums">{formatSeenAgo(v.seenAgo)}</span>
                      </motion.div>
                    )
                  }) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-muted-foreground/30 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-muted-foreground/40" />
                      </span>
                      <p className="text-xs text-muted-foreground">No active visitors right now</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── OS Breakdown ── */}
          {data.os.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 dark:bg-secondary/20 p-4 shadow-sm">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operating Systems</h4>
              <div className="flex flex-wrap gap-2">
                {data.os.map((o) => {
                  const pct   = data.total > 0 ? Math.round((o.count / data.total) * 100) : 0
                  const color = OS_COLORS[o.name] || '#94a3b8'
                  return (
                    <div
                      key={o.name}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border font-medium"
                      style={{ borderColor: `${color}50`, background: `${color}15`, color }}
                    >
                      <span>{o.name}</span>
                      <span className="opacity-60">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </motion.div>
  )
}
