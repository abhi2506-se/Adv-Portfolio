"use client";
import { motion } from "framer-motion";
import { Github, Star, GitFork, GitCommit, Code2 } from "lucide-react";
import type { GitHubMetrics } from "@/types/dashboard";

const CARD = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5";

export function GitHubSection({ data }: { data: GitHubMetrics }) {
  const stats = [
    { icon: Github, label: "Repositories", value: data.totalRepos, color: "#a3a3a3" },
    { icon: Star, label: "Total Stars", value: data.totalStars, color: "#f59e0b" },
    { icon: GitFork, label: "Total Forks", value: data.totalForks, color: "#06b6d4" },
    { icon: GitCommit, label: "Commits", value: data.totalCommits, color: "#10b981" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={CARD}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-400/20 border border-neutral-400/30">
          <Github className="h-4 w-4 text-neutral-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">GitHub Metrics</h3>
          <p className="text-xs text-white/40">Repository & contribution statistics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
            >
              <Icon className="h-4 w-4 mx-auto mb-1.5" style={{ color: s.color }} />
              <p className="text-xl font-bold text-white">{s.value.toLocaleString()}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Languages */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="h-3.5 w-3.5 text-blue-400" />
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Top Languages</h4>
          </div>
          <div className="space-y-2">
            {data.topLanguages.map((l, i) => (
              <div key={l.language}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{l.language}</span>
                  <span className="text-white font-medium">{l.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${l.percent}%` }}
                    transition={{ duration: 0.8, delay: i * 0.07 }}
                    className="h-full rounded-full"
                    style={{ background: l.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Repos */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Top Repositories</h4>
          </div>
          <div className="space-y-2.5">
            {data.repoMetrics.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-white/20 w-4">#{i + 1}</span>
                  <span className="text-xs text-white/70 truncate">{r.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="flex items-center gap-1 text-[11px] text-amber-400">
                    <Star className="h-3 w-3" />
                    {r.stars}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-cyan-400">
                    <GitFork className="h-3 w-3" />
                    {r.forks}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
