"use client";
import { motion } from "framer-motion";
import { useDashboard } from "@/hooks/useDashboard";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import {
  VisitorTrendChart,
  MonthlyGrowthChart,
  TrafficSourcesChart,
  DeviceUsageChart,
  BrowserStatsChart,
  ProjectPopularityChart,
  CountryChart,
  ActivityHeatmap,
} from "@/components/dashboard/Charts";
import { RecruiterSection } from "@/components/dashboard/RecruiterSection";
import { RealTimeSection } from "@/components/dashboard/RealTimeSection";
import { GitHubSection } from "@/components/dashboard/GitHubSection";
import { DevOpsSection } from "@/components/dashboard/DevOpsSection";
import { AIInsightsSection } from "@/components/dashboard/AIInsightsSection";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { PortfolioMetrics } from "@/components/dashboard/PortfolioMetrics";
import { AlertCircle } from "lucide-react";

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-xs text-white/35 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  );
}

export default function DashboardPage() {
  const { data, loading, error, refresh, lastRefreshed } = useDashboard(30_000);

  // ── Background ──────────────────────────────────────────────────────────────
  const bg = (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base dark */}
      <div className="absolute inset-0 bg-[#080810]" />
      {/* Gradient orbs */}
      <div className="absolute top-[-10%] left-[10%] h-[60vh] w-[60vw] rounded-full bg-blue-600/8 blur-[120px]" />
      <div className="absolute top-[30%] right-[-5%] h-[50vh] w-[45vw] rounded-full bg-violet-600/8 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[20%] h-[40vh] w-[50vw] rounded-full bg-cyan-600/6 blur-[100px]" />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <>
        {bg}
        <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
          <DashboardSkeleton />
        </div>
      </>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <>
        {bg}
        <div className="min-h-screen flex items-center justify-center">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Failed to load dashboard</p>
            <p className="text-white/50 text-sm mb-4">{error}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      {bg}
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-8 print:bg-white print:text-black">
        {/* Header */}
        <DashboardHeader
          data={data}
          lastRefreshed={lastRefreshed}
          onRefresh={refresh}
          loading={loading}
        />

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <Section id="kpis" title="Key Performance Indicators" subtitle="Core portfolio engagement metrics">
          <KPIGrid metrics={data.kpis} />
        </Section>

        {/* ── Charts Row 1 ──────────────────────────────────────────────────── */}
        <Section id="charts" title="Traffic Analytics" subtitle="Visitor trends and source analysis">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <VisitorTrendChart data={data.visitorTrend} />
            <TrafficSourcesChart data={data.trafficSources} />
          </div>
        </Section>

        {/* ── Charts Row 2 ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MonthlyGrowthChart data={data.monthlyGrowth} />
          <DeviceUsageChart data={data.deviceUsage} />
          <BrowserStatsChart data={data.browserStats} />
          <ProjectPopularityChart data={data.projectPopularity} />
        </div>

        {/* ── Charts Row 3 ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CountryChart data={data.countryData} />
          <ActivityHeatmap data={data.heatmap} />
        </div>

        {/* ── Recruiter Analytics ───────────────────────────────────────────── */}
        <Section id="recruiter" title="Recruiter Analytics" subtitle="Hiring-manager engagement and journey flow">
          <RecruiterSection data={data.recruiter} />
        </Section>

        {/* ── Real-Time ─────────────────────────────────────────────────────── */}
        <Section id="realtime" title="Real-Time Analytics" subtitle="Live active users, visitor feed and recent activities">
          <RealTimeSection data={data.realTime} />
        </Section>

        {/* ── GitHub + DevOps ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section id="github" title="GitHub Metrics" subtitle="Repository & contribution statistics">
            <GitHubSection data={data.github} />
          </Section>
          <Section id="devops" title="DevOps Metrics" subtitle="Deployment health & performance scores">
            <DevOpsSection data={data.devops} />
          </Section>
        </div>

        {/* ── Portfolio Metrics ─────────────────────────────────────────────── */}
        <Section id="portfolio" title="Portfolio Metrics" subtitle="Skills popularity, technology distribution and career timeline">
          <PortfolioMetrics />
        </Section>

        {/* ── AI Insights ───────────────────────────────────────────────────── */}
        <Section id="insights" title="AI Insights" subtitle="Intelligent recommendations powered by portfolio analytics">
          <AIInsightsSection data={data.aiInsights} />
        </Section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="pt-4 pb-10 border-t border-white/10 flex items-center justify-between text-xs text-white/25">
          <span>Portfolio Analytics Dashboard — Abhishek Singh</span>
          <span>Data refreshes every 30s • {data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString("en-IN") : ""}</span>
        </div>
      </div>
    </>
  );
}
