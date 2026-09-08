"use client";
import { motion } from "framer-motion";
import {
  Users, UserCheck, Eye, Clock, FileDown, Mail, Github, Linkedin,
  FolderOpen, Repeat, TrendingUp, TrendingDown,
} from "lucide-react";
import type { KPIMetric } from "@/types/dashboard";
import { useCountUp } from "@/hooks/useDashboard";

const ICON_MAP: Record<string, React.ElementType> = {
  Users, UserCheck, Eye, Clock, FileDown, Mail, Github, Linkedin,
  FolderOpen, Repeat,
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AnimatedValue({ value }: { value: number | string }) {
  const isNum = typeof value === "number";
  const count = useCountUp(isNum ? value : 0);
  if (!isNum) return <span>{value}</span>;
  return <span>{count.toLocaleString()}</span>;
}

function KPICard({ metric, index }: { metric: KPIMetric; index: number }) {
  const Icon = ICON_MAP[metric.icon] || Users;
  const positive = metric.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:border-white/20 transition-all duration-300 hover:bg-white/8 hover:shadow-2xl hover:shadow-black/20"
    >
      {/* gradient bg */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />

      {/* top row */}
      <div className="relative flex items-start justify-between mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${metric.color}22`, border: `1px solid ${metric.color}33` }}
        >
          <Icon className="h-5 w-5" style={{ color: metric.color }} />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            positive
              ? "text-emerald-400 bg-emerald-400/10"
              : "text-red-400 bg-red-400/10"
          }`}
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{metric.change}%
        </div>
      </div>

      {/* value */}
      <div className="relative mb-1">
        <p className="text-2xl font-bold text-white tracking-tight">
          {metric.prefix}<AnimatedValue value={metric.value} />{metric.suffix}
        </p>
        <p className="text-xs text-white/50 mt-0.5">{metric.changeLabel}</p>
      </div>

      {/* label + sparkline */}
      <div className="relative flex items-end justify-between mt-3">
        <p className="text-sm text-white/70 font-medium">{metric.label}</p>
        {metric.sparkline && (
          <Sparkline data={metric.sparkline} color={metric.color} />
        )}
      </div>
    </motion.div>
  );
}

export function KPIGrid({ metrics }: { metrics: KPIMetric[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((m, i) => (
        <KPICard key={m.id} metric={m} index={i} />
      ))}
    </div>
  );
}
