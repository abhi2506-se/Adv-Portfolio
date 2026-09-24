"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Users, Globe, Download, Mail, Github, Linkedin, Eye } from "lucide-react";
import type { RealTimeData, Activity, LiveFeedItem } from "@/types/dashboard";

const CARD = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5";

function PulsingDot({ color = "#10b981" }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }}
      />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
    </span>
  );
}

const ACTIVITY_ICONS: Record<Activity["type"], React.ElementType> = {
  view: Eye,
  download: Download,
  contact: Mail,
  github: Github,
  linkedin: Linkedin,
};

const ACTIVITY_COLORS: Record<Activity["type"], string> = {
  view: "#3b82f6",
  download: "#10b981",
  contact: "#f59e0b",
  github: "#a3a3a3",
  linkedin: "#0077b5",
};

function ActivityItem({ item }: { item: Activity }) {
  const Icon = ACTIVITY_ICONS[item.type];
  const color = ACTIVITY_COLORS[item.type];
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}22` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70 truncate">{item.description}</p>
      </div>
      <span className="text-[10px] text-white/30 shrink-0">{item.time}</span>
    </motion.div>
  );
}

function LiveFeedRow({ item }: { item: LiveFeedItem }) {
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-center gap-2 text-xs py-1.5 border-b border-white/5 last:border-0"
    >
      <span className="text-base leading-none">{item.flag}</span>
      <span className="text-white/60 truncate flex-1">{item.country}</span>
      <span className="text-white/40 font-mono truncate max-w-[80px]">{item.page}</span>
      <span className="text-white/30 shrink-0">{item.time}</span>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
        style={{
          background: item.device === "Mobile" ? "#8b5cf622" : item.device === "Tablet" ? "#06b6d422" : "#3b82f622",
          color: item.device === "Mobile" ? "#8b5cf6" : item.device === "Tablet" ? "#06b6d4" : "#3b82f6",
        }}
      >
        {item.device}
      </span>
    </motion.div>
  );
}

export function RealTimeSection({ data: initialData }: { data: RealTimeData }) {
  const [data, setData] = useState(initialData);
  const [activeUsers, setActiveUsers] = useState(initialData.activeUsers);

  // Poll real visitor data every 30 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/visitor-analytics', { cache: 'no-store' });
        if (res.ok) {
          const d = await res.json();
          setActiveUsers(d.active || 0);
          if (d.liveVisitors && d.liveVisitors.length > 0) {
            const flags: Record<string, string> = {
              India: '🇮🇳', USA: '🇺🇸', UK: '🇬🇧', Germany: '🇩🇪',
              Canada: '🇨🇦', Australia: '🇦🇺', Singapore: '🇸🇬',
              France: '🇫🇷', Japan: '🇯🇵', Brazil: '🇧🇷',
            };
            setData(prev => ({
              ...prev,
              activeUsers: d.active,
              onlineVisitors: d.active,
              feed: d.liveVisitors.map((v: any) => ({
                id: `live-${v.id}`,
                country: v.country && v.city ? `${v.city}, ${v.country}` : (v.country || 'Unknown'),
                flag: flags[v.country] || '🌍',
                page: v.page || '/',
                time: v.seenAgo < 60 ? `${v.seenAgo}s ago` : `${Math.floor(v.seenAgo / 60)}m ago`,
                device: v.device || 'Desktop',
              })),
            }));
          }
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 30_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Live Active Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={CARD}
      >
        <div className="flex items-center gap-2 mb-5">
          <PulsingDot />
          <h3 className="text-sm font-semibold text-white">Live Active Users</h3>
        </div>

        <div className="flex items-center justify-center py-6">
          <div className="relative">
            {/* Outer rings */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
            <div className="absolute -inset-4 rounded-full border border-emerald-500/10 animate-pulse" />
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10">
              <div className="text-center">
                <motion.p
                  key={activeUsers}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-emerald-400"
                >
                  {activeUsers}
                </motion.p>
                <p className="text-[10px] text-emerald-400/60 mt-0.5">online now</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <Users className="h-4 w-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{data.onlineVisitors}</p>
            <p className="text-[10px] text-white/40">Current Online</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <Globe className="h-4 w-4 text-violet-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{data.feed.length}</p>
            <p className="text-[10px] text-white/40">In Feed</p>
          </div>
        </div>
      </motion.div>

      {/* Live Visitor Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={CARD}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-red-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white">Live Visitor Feed</h3>
          </div>
          <span className="text-[10px] text-white/30 font-mono">auto-updates</span>
        </div>
        <div className="max-h-56 overflow-y-auto scrollbar-none">
          <AnimatePresence mode="popLayout">
            {data.feed.map((item) => (
              <LiveFeedRow key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Recent Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`${CARD} md:col-span-2`}
      >
        <h3 className="text-sm font-semibold text-white mb-4">Recent Activities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          {data.recentActivities.map((a) => (
            <ActivityItem key={a.id} item={a} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
