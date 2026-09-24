'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Github, GitCommit, Star, GitFork, Code2, Activity, ExternalLink,
  GitPullRequest, AlertCircle, Zap, RefreshCw, Package, Users, Eye
} from 'lucide-react'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import { usePortfolioData } from '@/hooks/usePortfolioData'

interface ActivityEvent { id: string; type: string; icon: string; description: string; repo: string; repoUrl: string; createdAt: string }
interface RepoData { id: number; name: string; description: string; url: string; stars: number; forks: number; language: string; updatedAt: string; watchers: number }
interface LangStat { name: string; count: number; fill: string }
interface GithubData {
  username: string
  profile: { name: string; bio: string; avatarUrl: string; publicRepos: number; followers: number; following: number; profileUrl: string }
  activityFeed: ActivityEvent[]
  topRepos: RepoData[]
  langStats: LangStat[]
  contributionWeeks: { week: string; days: { date: string; count: number; level: number }[] }[]
  fetchedAt: string; error?: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`
}

const langColors: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', Go: '#00ADD8',
  Rust: '#dea584', HTML: '#e34c26', CSS: '#563d7c', default: '#6b7280'
}

const HEAT_COLORS = ['#1e293b', '#164e63', '#0e7490', '#0891b2', '#22d3ee']

function HeatCell({ level, date }: { level: number; date: string }) {
  return (
    <motion.div
      title={`${date}: ${level} contributions`}
      whileHover={{ scale: 1.4 }}
      className="w-3 h-3 rounded-sm cursor-default"
      style={{ background: HEAT_COLORS[Math.min(level, 4)] }}
    />
  )
}

function ContributionHeatmap({ weeks }: { weeks: GithubData['contributionWeeks'] }) {
  if (!weeks || weeks.length === 0) return null
  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        <div className="flex flex-col gap-1 mr-1">
          {DAYS.map((d, i) => (
            <div key={i} className="h-3 w-3 text-[8px] text-muted-foreground flex items-center justify-end">{d}</div>
          ))}
        </div>
        {weeks.slice(-26).map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.days.map((day, di) => (
              <HeatCell key={di} level={day.level} date={day.date} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-muted-foreground">Less</span>
        {HEAT_COLORS.map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />)}
        <span className="text-[10px] text-muted-foreground">More</span>
      </div>
    </div>
  )
}

export function GithubStats() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const { hero } = usePortfolioData()
  const [data, setData] = useState<GithubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/github-activity', { cache: 'no-store' })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setData(d)
    } catch (e) { setError('Failed to fetch GitHub data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

  return (
    <motion.section
      id="github"
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={container}
      className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto"
    >
      <motion.div variants={item} className="mb-12">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-foreground/5 border border-border/60">
                <Github className="w-5 h-5 text-foreground" />
              </div>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Open Source</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black">
              GitHub{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Activity</span>
            </h2>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/60 rounded-full px-4 py-2 transition-colors bg-secondary/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-secondary/40 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <motion.div variants={item} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 mb-8">
          <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
        </motion.div>
      )}

      {data && !error && (
        <>
          {/* Profile KPIs */}
          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Package,        label: 'Repositories', value: data.profile.publicRepos, color: '#3b82f6' },
              { icon: Users,          label: 'Followers',    value: data.profile.followers,   color: '#10b981' },
              { icon: Star,           label: 'Total Stars',  value: data.topRepos.reduce((a, r) => a + r.stars, 0), color: '#f59e0b' },
              { icon: GitFork,        label: 'Total Forks',  value: data.topRepos.reduce((a, r) => a + r.forks, 0), color: '#8b5cf6' },
            ].map(stat => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-black tabular-nums" style={{ color: stat.color }}>
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              )
            })}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Contribution heatmap */}
            <motion.div variants={item} className="lg:col-span-2 rounded-2xl border border-border/60 bg-secondary/20 p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />Contribution Heatmap (Last 26 Weeks)
              </p>
              {data.contributionWeeks?.length > 0
                ? <ContributionHeatmap weeks={data.contributionWeeks} />
                : <p className="text-xs text-muted-foreground">Heatmap requires GitHub token with read:user scope.</p>
              }
            </motion.div>

            {/* Language chart */}
            <motion.div variants={item} className="rounded-2xl border border-border/60 bg-secondary/20 p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5" />Language Usage
              </p>
              {data.langStats && data.langStats.length > 0 ? (
                <div className="space-y-2.5">
                  {data.langStats.slice(0, 6).map(lang => {
                    const total = data.langStats.reduce((a, l) => a + l.count, 0)
                    const pct   = total > 0 ? Math.round((lang.count / total) * 100) : 0
                    const color = langColors[lang.name] ?? langColors.default
                    return (
                      <div key={lang.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">{lang.name}</span>
                          <span className="tabular-nums text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                            className="h-1.5 rounded-full"
                            style={{ background: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No language data yet.</p>
              )}
            </motion.div>
          </div>

          {/* Top repos */}
          <motion.div variants={item} className="mb-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Top Repositories</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.topRepos.slice(0, 4).map(repo => {
                const color = langColors[repo.language] ?? langColors.default
                return (
                  <motion.a
                    key={repo.id}
                    href={repo.url} target="_blank" rel="noopener noreferrer"
                    whileHover={{ y: -2, scale: 1.01 }}
                    className="block rounded-2xl border border-border/60 bg-secondary/20 p-4 hover:border-border transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors truncate flex-1 mr-2">{repo.name}</p>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        {repo.language || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars}</span>
                      <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks}</span>
                    </div>
                  </motion.a>
                )
              })}
            </div>
          </motion.div>

          {/* Activity feed */}
          {data.activityFeed.length > 0 && (
            <motion.div variants={item} className="rounded-2xl border border-border/60 bg-secondary/20 p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />Recent Activity
              </p>
              <div className="space-y-3">
                {data.activityFeed.slice(0, 8).map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5 text-muted-foreground">
                      <GitCommit className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-medium truncate">{ev.description}</p>
                      <a href={ev.repoUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline truncate block">{ev.repo}</a>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(ev.createdAt)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.section>
  )
}
