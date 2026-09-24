"use client";
import { motion } from "framer-motion";
import { Briefcase, Building2, FileDown, Code2, FolderGit2, ArrowRight } from "lucide-react";
import type { RecruiterData } from "@/types/dashboard";

const CARD = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5";

function StatBadge({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}22`, border: `1px solid ${color}33` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}

export function RecruiterSection({ data }: { data: RecruiterData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={CARD}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30">
          <Briefcase className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Recruiter Analytics</h3>
          <p className="text-xs text-white/40">Hiring manager engagement metrics</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatBadge icon={Briefcase} label="Recruiter Visits" value={data.visits} color="#f59e0b" />
        <StatBadge icon={Building2} label="Company Visits" value={data.companies} color="#8b5cf6" />
        <StatBadge icon={FileDown} label="Resume Downloads" value={data.resumeDownloads} color="#10b981" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Skills */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="h-3.5 w-3.5 text-cyan-400" />
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Top Viewed Skills</h4>
          </div>
          <div className="space-y-2">
            {data.topSkills.map((s, i) => {
              const max = data.topSkills[0].views;
              const pct = (s.views / max) * 100;
              const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];
              return (
                <div key={s.skill}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">{s.skill}</span>
                    <span className="text-white font-medium">{s.views.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.08 }}
                      className="h-full rounded-full"
                      style={{ background: colors[i % colors.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Projects */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FolderGit2 className="h-3.5 w-3.5 text-violet-400" />
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Top Viewed Projects</h4>
          </div>
          <div className="space-y-2.5">
            {data.topProjects.map((p, i) => {
              const max = data.topProjects[0].views;
              const pct = (p.views / max) * 100;
              return (
                <div key={p.project} className="flex items-center gap-3">
                  <span className="text-xs text-white/30 w-4 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-white/70 truncate">{p.project}</span>
                      <span className="text-white font-medium">{p.views.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visitor Journey Flow */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Visitor Journey Flow</h4>
          </div>
          <div className="space-y-1.5">
            {data.journey.map((step, i) => (
              <div key={step.stage} className="relative">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/70 flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-white/20">→</span>
                    )}
                    {step.stage}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">{step.count.toLocaleString()}</span>
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        color: step.percent > 50 ? "#10b981" : step.percent > 20 ? "#f59e0b" : "#ef4444",
                        background: step.percent > 50 ? "#10b98118" : step.percent > 20 ? "#f59e0b18" : "#ef444418",
                      }}
                    >
                      {step.percent}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${step.percent}%` }}
                    transition={{ duration: 0.9, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      background: step.percent > 50
                        ? "linear-gradient(90deg,#10b981,#06b6d4)"
                        : step.percent > 20
                          ? "linear-gradient(90deg,#f59e0b,#f97316)"
                          : "linear-gradient(90deg,#ef4444,#ec4899)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
