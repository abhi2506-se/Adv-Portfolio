"use client";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { BarChart2, Layers, Clock, TrendingUp } from "lucide-react";

const CARD = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(15,15,20,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "12px",
  },
};

// Static portfolio-level data (project views + skills + tech)
const SKILL_POPULARITY = [
  { subject: "React", A: 95 },
  { subject: "TypeScript", A: 90 },
  { subject: "Next.js", A: 88 },
  { subject: "Node.js", A: 82 },
  { subject: "PostgreSQL", A: 74 },
  { subject: "Docker", A: 68 },
];

const TECH_DISTRIBUTION = [
  { name: "Frontend", value: 42, color: "#3b82f6" },
  { name: "Backend", value: 28, color: "#8b5cf6" },
  { name: "DevOps", value: 16, color: "#10b981" },
  { name: "Database", value: 14, color: "#f59e0b" },
];

const EXPERIENCE_TIMELINE = [
  { year: "2021", events: 2, label: "Started dev journey" },
  { year: "2022", events: 5, label: "First freelance projects" },
  { year: "2023", events: 9, label: "Open source contributions" },
  { year: "2024", events: 14, label: "Amazon internship" },
  { year: "2025", events: 18, label: "Portfolio v27 launch" },
  { year: "2026", events: 8, label: "Ongoing projects" },
];

export function PortfolioMetrics() {
  const maxEvents = Math.max(...EXPERIENCE_TIMELINE.map((e) => e.events));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Skill Popularity Radar */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Skill Popularity</h4>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={SKILL_POPULARITY}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
              <Radar name="Skill" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip {...TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Tech Distribution */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-3.5 w-3.5 text-violet-400" />
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Tech Distribution</h4>
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={TECH_DISTRIBUTION} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value">
                  {TECH_DISTRIBUTION.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {TECH_DISTRIBUTION.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-white/60">{d.name}</span>
                  </div>
                  <span className="text-white font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Experience Timeline */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Experience Timeline</h4>
          </div>
          <div className="space-y-2.5">
            {EXPERIENCE_TIMELINE.map((e, i) => (
              <div key={e.year} className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-8 shrink-0 font-mono">{e.year}</span>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(e.events / maxEvents) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.07 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  />
                </div>
                <span className="text-[10px] text-white/30 w-4 text-right shrink-0">{e.events}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/25 mt-3 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Projects & milestones per year
          </p>
        </div>
      </div>
    </motion.div>
  );
}
