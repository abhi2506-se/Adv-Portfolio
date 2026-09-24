"use client";
import { motion } from "framer-motion";

function Shimmer({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white/5 ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Shimmer className="h-10 w-10 !rounded-xl" />
          <div className="space-y-2">
            <Shimmer className="h-5 w-44 !rounded-lg" />
            <Shimmer className="h-3 w-28 !rounded-md" />
          </div>
        </div>
        <div className="flex gap-2">
          <Shimmer className="h-9 w-20 !rounded-xl" />
          <Shimmer className="h-9 w-20 !rounded-xl" />
          <Shimmer className="h-9 w-20 !rounded-xl" />
        </div>
      </div>

      {/* KPI Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Shimmer key={i} className="h-36" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Shimmer className="h-72 lg:col-span-2" />
        <Shimmer className="h-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-56" />
        ))}
      </div>

      {/* Recruiter skeleton */}
      <Shimmer className="h-72" />

      {/* Real-time skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Shimmer className="h-64" />
        <Shimmer className="h-64" />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Shimmer className="h-64" />
        <Shimmer className="h-64" />
      </div>
    </div>
  );
}
