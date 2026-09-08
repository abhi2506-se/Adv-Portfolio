"use client";
import { motion } from "framer-motion";
import { LayoutDashboard, RefreshCw, Clock } from "lucide-react";
import { ExportButtons } from "./ExportButtons";
import type { DashboardData } from "@/types/dashboard";

interface DashboardHeaderProps {
  data: DashboardData;
  lastRefreshed: Date | null;
  onRefresh: () => void;
  loading: boolean;
}

export function DashboardHeader({ data, lastRefreshed, onRefresh, loading }: DashboardHeaderProps) {
  const fmt = lastRefreshed
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(lastRefreshed)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10"
    >
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
          <LayoutDashboard className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-white/40">
              {fmt ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last updated {fmt}
                </span>
              ) : (
                "Loading data…"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <ExportButtons data={data} />
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </motion.button>
      </div>
    </motion.div>
  );
}
