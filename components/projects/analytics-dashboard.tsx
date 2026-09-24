'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, Eye, Code2, Star, GitFork,
  Users, Globe, Activity, Award
} from 'lucide-react'

interface AnalyticsStat {
  label: string
  value: string | number
  change?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface PortfolioAnalyticsDashboardProps {
  githubStats?: {
    totalRepos: number
    totalStars: number
    totalForks: number
    topLanguages: { language: string; percent: number; color: string }[]
    repoMetrics: { name: string; stars: number; forks: number }[]
  }
}

export function PortfolioAnalyticsDashboard({ githubStats }: PortfolioAnalyticsDashboardProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const stats: AnalyticsStat[] = [
    {
      label: 'Total Repos',
      value: githubStats?.totalRepos || 0,
      icon: Code2,
      color: 'from-blue-600 to-cyan-500',
      change: '+2 this month',
    },
    {
      label: 'Total Stars',
      value: githubStats?.totalStars || 0,
      icon: Star,
      color: 'from-yellow-600 to-orange-500',
      change: 'across all repos',
    },
    {
      label: 'Total Forks',
      value: githubStats?.totalForks || 0,
      icon: GitFork,
      color: 'from-green-600 to-emerald-500',
    },
    {
      label: 'Active Projects',
      value: githubStats?.repoMetrics?.length || 0,
      icon: Activity,
      color: 'from-purple-600 to-pink-500',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-secondary/20 border border-border rounded-2xl p-6 space-y-6"
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        <h3 className="font-bold text-lg">Portfolio Analytics</h3>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live data
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, change, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
            className="bg-secondary/40 border border-border rounded-xl p-4"
          >
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            {change && <p className="text-xs text-blue-400 mt-1">{change}</p>}
          </motion.div>
        ))}
      </div>

      {/* Top languages */}
      {githubStats?.topLanguages && githubStats.topLanguages.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Language Distribution</h4>
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            {githubStats.topLanguages.slice(0, 6).map(lang => (
              <motion.div
                key={lang.language}
                initial={{ flex: 0 }}
                animate={{ flex: lang.percent }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="rounded-sm"
                style={{ background: lang.color }}
                title={`${lang.language}: ${lang.percent}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {githubStats.topLanguages.slice(0, 6).map(lang => (
              <div key={lang.language} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: lang.color }} />
                {lang.language} {lang.percent}%
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top repos */}
      {githubStats?.repoMetrics && githubStats.repoMetrics.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Top Projects by Stars</h4>
          <div className="space-y-2">
            {githubStats.repoMetrics.slice(0, 5).map((repo, i) => {
              const maxStars = Math.max(...githubStats.repoMetrics.map(r => r.stars), 1)
              return (
                <div key={repo.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground/50 w-4">{i + 1}</span>
                  <span className="text-sm font-medium flex-1 truncate">{repo.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(repo.stars / maxStars) * 100}%` }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.6 }}
                        className="h-full bg-yellow-500 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400" /> {repo.stars}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}
