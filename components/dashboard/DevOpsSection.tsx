"use client";
import { motion } from "framer-motion";
import { Rocket, CheckCircle2, XCircle, Clock, Wifi, Zap, Activity } from "lucide-react";
import type { DevOpsMetrics } from "@/types/dashboard";

const CARD = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5";

function GaugeRing({ value, max = 100, color, size = 80, strokeWidth = 6 }: {
  value: number; max?: number; color: string; size?: number; strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = value / max;
  const dash = pct * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  );
}

function LighthouseScore({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center">
        <GaugeRing value={score} color={color} size={64} strokeWidth={5} />
        <span className="absolute text-sm font-bold text-white">{score}</span>
      </div>
      <span className="text-[10px] text-white/50 text-center leading-tight">{label}</span>
    </div>
  );
}

export function DevOpsSection({ data }: { data: DevOpsMetrics }) {
  const cicdColor =
    data.cicdStatus === "passing" ? "#10b981" : data.cicdStatus === "failing" ? "#ef4444" : "#f59e0b";
  const CiIcon =
    data.cicdStatus === "passing" ? CheckCircle2 : data.cicdStatus === "failing" ? XCircle : Clock;

  const lh = data.lighthouseScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={CARD}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
          <Activity className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">DevOps Metrics</h3>
          <p className="text-xs text-white/40">Deployment health & performance</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {/* Deployments */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <Rocket className="h-4 w-4 text-violet-400 mb-2" />
          <p className="text-2xl font-bold text-white">{data.deployments}</p>
          <p className="text-[10px] text-white/40 mt-0.5">Total Deployments</p>
        </div>

        {/* Build Success Rate */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-semibold">{data.buildSuccessRate}%</span>
          </div>
          <p className="text-lg font-bold text-white">{data.buildSuccessRate}%</p>
          <p className="text-[10px] text-white/40 mt-0.5">Build Success Rate</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.buildSuccessRate}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </div>

        {/* CI/CD Status */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <CiIcon className="h-4 w-4 mb-2" style={{ color: cicdColor }} />
          <p className="text-lg font-bold text-white capitalize">{data.cicdStatus}</p>
          <p className="text-[10px] text-white/40 mt-0.5">CI/CD Status</p>
          <div
            className="mt-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${cicdColor}22`, color: cicdColor }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: cicdColor }} />
            {data.cicdStatus}
          </div>
        </div>

        {/* Uptime */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <Wifi className="h-4 w-4 text-cyan-400 mb-2" />
          <p className="text-2xl font-bold text-white">{data.uptime}%</p>
          <p className="text-[10px] text-white/40 mt-0.5">Uptime</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.uptime}%` }}
              transition={{ duration: 1.2 }}
              className="h-full rounded-full bg-cyan-500"
            />
          </div>
        </div>

        {/* API Response Time */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <Zap className="h-4 w-4 text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-white">{data.apiResponseTime}<span className="text-sm text-white/40 ml-1">ms</span></p>
          <p className="text-[10px] text-white/40 mt-0.5">API Response Time</p>
        </div>

        {/* Lighthouse summary */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <GaugeRing value={lh.performance} color="#10b981" size={56} strokeWidth={5} />
              <span className="absolute text-sm font-bold text-white">{lh.performance}</span>
            </div>
            <p className="text-[10px] text-white/40 mt-1">Performance</p>
          </div>
        </div>
      </div>

      {/* Lighthouse full breakdown */}
      <div>
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Lighthouse Scores</h4>
        <div className="flex justify-around">
          <LighthouseScore label="Performance" score={lh.performance} color="#10b981" />
          <LighthouseScore label="Accessibility" score={lh.accessibility} color="#3b82f6" />
          <LighthouseScore label="Best Practices" score={lh.bestPractices} color="#8b5cf6" />
          <LighthouseScore label="SEO" score={lh.seo} color="#f59e0b" />
        </div>
      </div>
    </motion.div>
  );
}
