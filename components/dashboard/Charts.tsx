"use client";
import { motion } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type {
  VisitorData, ChartDataPoint, TrafficSource, DeviceData,
  BrowserData, ProjectData, CountryData, HeatmapData,
} from "@/types/dashboard";

const CARD = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5";

function ChartCard({
  title, subtitle, children, className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`${CARD} ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(15,15,20,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "12px",
  },
  labelStyle: { color: "rgba(255,255,255,0.6)" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

// ─── 1. Visitors Trend (Line Chart) ──────────────────────────────────────────

export function VisitorTrendChart({ data }: { data: VisitorData[] }) {
  return (
    <ChartCard title="Visitors Trend" subtitle="Monthly overview — visitors, unique & page views" className="col-span-2">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
          <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Visitors" />
          <Line type="monotone" dataKey="unique" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Unique" />
          <Line type="monotone" dataKey="pageViews" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="Page Views" strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── 2. Monthly Growth (Area Chart) ──────────────────────────────────────────

export function MonthlyGrowthChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ChartCard title="Monthly Growth" subtitle="Cumulative visitor growth trend">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="url(#growthGrad)" name="Visitors" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── 3. Traffic Sources (Pie Chart) ──────────────────────────────────────────

export function TrafficSourcesChart({ data }: { data: TrafficSource[] }) {
  return (
    <ChartCard title="Traffic Sources" subtitle="Where visitors come from">
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} dataKey="value">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="text-white/60">{d.name}</span>
              </div>
              <span className="text-white font-medium">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

// ─── 4. Device Usage (Donut Chart) ───────────────────────────────────────────

export function DeviceUsageChart({ data }: { data: DeviceData[] }) {
  return (
    <ChartCard title="Device Usage" subtitle="Desktop · Mobile · Tablet">
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-white/60">{d.name}</span>
              <span className="text-white font-semibold">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

// ─── 5. Browser Stats (Bar Chart) ────────────────────────────────────────────

export function BrowserStatsChart({ data }: { data: BrowserData[] }) {
  return (
    <ChartCard title="Browser Statistics" subtitle="Sessions by browser">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="browser" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
          <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Users" />
          <Bar dataKey="sessions" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Sessions" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── 6. Project Popularity (Horizontal Bar) ───────────────────────────────────

export function ProjectPopularityChart({ data }: { data: ProjectData[] }) {
  return (
    <ChartCard title="Project Popularity" subtitle="Views vs clicks per project">
      <div className="space-y-3">
        {data.map((p, i) => {
          const maxViews = data[0].views;
          const pct = (p.views / maxViews) * 100;
          const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];
          return (
            <div key={p.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/70 truncate max-w-[60%]">{p.name}</span>
                <span className="text-white font-medium">{p.views.toLocaleString()} views</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: colors[i % colors.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ─── 7. Country Visitors ─────────────────────────────────────────────────────

export function CountryChart({ data }: { data: CountryData[] }) {
  const total = data.reduce((s, d) => s + d.visitors, 0);
  return (
    <ChartCard title="Country-wise Visitors" subtitle="Top 10 countries by visitor count">
      <div className="space-y-2.5 max-h-64 overflow-y-auto scrollbar-none">
        {data.map((c, i) => {
          const pct = (c.visitors / total) * 100;
          return (
            <div key={c.code} className="flex items-center gap-3">
              <span className="text-lg leading-none">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-white/70 truncate">{c.country}</span>
                  <span className="text-white font-medium ml-2">{c.visitors.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                  />
                </div>
              </div>
              <span className="text-xs text-white/40 w-8 text-right">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ─── 8. Hourly Activity Heatmap ───────────────────────────────────────────────

export function ActivityHeatmap({ data }: { data: HeatmapData[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxVal = Math.max(...data.map((d) => d.value));

  function cellColor(val: number) {
    const t = val / maxVal;
    if (t < 0.2) return "rgba(59,130,246,0.1)";
    if (t < 0.4) return "rgba(59,130,246,0.25)";
    if (t < 0.6) return "rgba(59,130,246,0.45)";
    if (t < 0.8) return "rgba(59,130,246,0.65)";
    return "rgba(59,130,246,0.9)";
  }

  return (
    <ChartCard title="Hourly Activity Heatmap" subtitle="Visitor activity by day and hour" className="col-span-2">
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Hour labels */}
          <div className="flex mb-1 ml-10">
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-white/30">
                {h % 4 === 0 ? `${h}h` : ""}
              </div>
            ))}
          </div>
          {/* Grid */}
          {days.map((day) => (
            <div key={day} className="flex items-center mb-1">
              <span className="w-10 text-[10px] text-white/40 shrink-0">{day}</span>
              {hours.map((h) => {
                const cell = data.find((d) => d.day === day && d.hour === h);
                const val = cell?.value || 0;
                return (
                  <div
                    key={h}
                    className="flex-1 mx-px h-5 rounded-sm cursor-default transition-transform hover:scale-110"
                    style={{ background: cellColor(val) }}
                    title={`${day} ${h}:00 — ${val} visitors`}
                  />
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center gap-1 mt-2 justify-end">
            <span className="text-[10px] text-white/30 mr-1">Less</span>
            {[0.1, 0.25, 0.45, 0.65, 0.9].map((t) => (
              <div
                key={t}
                className="h-3 w-3 rounded-sm"
                style={{ background: `rgba(59,130,246,${t})` }}
              />
            ))}
            <span className="text-[10px] text-white/30 ml-1">More</span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
