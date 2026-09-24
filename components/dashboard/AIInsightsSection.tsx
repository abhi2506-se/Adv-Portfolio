"use client";
import { motion } from "framer-motion";
import { Sparkles, FolderOpen, Code2, Briefcase, BarChart3, TrendingUp, Lightbulb } from "lucide-react";
import type { AIInsights } from "@/types/dashboard";

const CARD = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5";

function ScoreGauge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-end justify-between mb-2">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-2xl font-bold text-white">{value}<span className="text-sm text-white/40">/100</span></span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}99)`,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}

export function AIInsightsSection({ data }: { data: AIInsights }) {
  const cards = [
    {
      icon: FolderOpen,
      label: "Most Viewed Project",
      value: data.mostViewedProject,
      color: "#3b82f6",
      gradient: "from-blue-500/20 to-transparent",
    },
    {
      icon: Code2,
      label: "Most Searched Skill",
      value: data.mostSearchedSkill,
      color: "#8b5cf6",
      gradient: "from-violet-500/20 to-transparent",
    },
    {
      icon: TrendingUp,
      label: "Monthly Growth Rate",
      value: `+${data.monthlyGrowthRate}%`,
      color: "#10b981",
      gradient: "from-emerald-500/20 to-transparent",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={CARD}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
          <Sparkles className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Insights</h3>
          <p className="text-xs text-white/40">Intelligent portfolio analytics & recommendations</p>
        </div>
      </div>

      {/* Highlight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-xl border border-white/10 bg-gradient-to-br ${c.gradient} p-4`}
            >
              <Icon className="h-4 w-4 mb-2" style={{ color: c.color }} />
              <p className="text-base font-bold text-white truncate">{c.value}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{c.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Score gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <ScoreGauge
          label="Recruiter Interest Score"
          value={data.recruiterInterestScore}
          color="#f59e0b"
        />
        <ScoreGauge
          label="Portfolio Performance Score"
          value={data.portfolioPerformanceScore}
          color="#10b981"
        />
      </div>

      {/* AI Recommendation */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 mt-0.5">
            <Lightbulb className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-300 mb-1">AI Recommendation</p>
            <p className="text-xs text-white/60 leading-relaxed">{data.recommendation}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
