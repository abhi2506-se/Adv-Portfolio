'use client'

import { motion } from 'framer-motion'
import { Star, GitFork, Eye, Bug, GitCommit, Users, ExternalLink, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { GitHubAnalytics } from '@/types/projects'

interface GitHubAnalyticsPanelProps {
  analytics: GitHubAnalytics
  repoUrl: string
}

export function GitHubAnalyticsPanel({ analytics: gh, repoUrl }: GitHubAnalyticsPanelProps) {
  const stats = [
    { icon: Star, label: 'Stars', value: gh.stars, color: 'text-yellow-400' },
    { icon: GitFork, label: 'Forks', value: gh.forks, color: 'text-blue-400' },
    { icon: Eye, label: 'Watchers', value: gh.watchers, color: 'text-purple-400' },
    { icon: Bug, label: 'Open Issues', value: gh.openIssues, color: 'text-red-400' },
    { icon: GitCommit, label: 'Commits (12w)', value: gh.commitCount, color: 'text-green-400' },
    { icon: Users, label: 'Contributors', value: gh.contributorCount, color: 'text-cyan-400' },
  ]

  const maxCommit = Math.max(...gh.weeklyCommits, 1)

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {stats.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="bg-secondary/40 border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Language breakdown */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-secondary/30 border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Language Distribution
          </h3>
          <div className="space-y-3">
            {gh.languagePercentages.map((lang, i) => (
              <div key={lang.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: lang.color }} />
                    <span className="font-medium">{lang.name}</span>
                  </div>
                  <span className="text-muted-foreground">{lang.percent}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${lang.percent}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: lang.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Commit activity */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-secondary/30 border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Commit Activity (12 weeks)
          </h3>
          <div className="flex items-end gap-1 h-24">
            {gh.weeklyCommits.map((count, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-green-500/20 hover:bg-green-500/40 rounded-sm transition-colors cursor-default"
                style={{ height: `${(count / maxCommit) * 100}%`, minHeight: count > 0 ? 4 : 2 }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.5 + i * 0.04, duration: 0.4 }}
                title={`Week ${i + 1}: ${count} commits`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>12 weeks ago</span>
            <span>Now</span>
          </div>
        </motion.div>
      </div>

      {/* Recent commits */}
      {gh.recentCommits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-secondary/30 border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-green-400" />
            Recent Commits
          </h3>
          <div className="space-y-3">
            {gh.recentCommits.map((commit, i) => (
              <motion.div
                key={commit.sha}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.07 }}
                className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg"
              >
                <code className="text-xs text-blue-400 font-mono mt-0.5 shrink-0">{commit.sha}</code>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{commit.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{commit.author}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {commit.date ? new Date(commit.date).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Contributors */}
      {gh.contributors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-secondary/30 border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Top Contributors
          </h3>
          <div className="flex flex-wrap gap-3">
            {gh.contributors.map((c, i) => (
              <motion.a
                key={c.login}
                href={c.html_url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.07 }}
                className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-lg hover:bg-secondary/70 transition-colors group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.avatar_url}
                  alt={c.login}
                  className="w-7 h-7 rounded-full"
                />
                <div>
                  <p className="text-xs font-medium group-hover:text-blue-400 transition-colors">{c.login}</p>
                  <p className="text-xs text-muted-foreground">{c.contributions} commits</p>
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex justify-end">
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View on GitHub <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
