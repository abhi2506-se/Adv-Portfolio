"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { DashboardData } from "@/types/dashboard";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(data: DashboardData) {
  const rows = [
    ["Metric", "Value", "Change"],
    ...data.kpis.map((k) => [k.label, String(k.value), `${k.change}%`]),
    [""],
    ["Month", "Visitors", "Unique", "Page Views", "Sessions"],
    ...data.visitorTrend.map((v) => [v.date, v.visitors, v.unique, v.pageViews, v.sessions]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), "dashboard-analytics.csv");
}

function exportJSON(data: DashboardData) {
  const json = JSON.stringify(
    {
      exported: new Date().toISOString(),
      kpis: data.kpis,
      visitorTrend: data.visitorTrend,
      trafficSources: data.trafficSources,
      devices: data.deviceUsage,
      countries: data.countryData,
      github: data.github,
      devops: data.devops,
      aiInsights: data.aiInsights,
    },
    null,
    2,
  );
  downloadBlob(new Blob([json], { type: "application/json" }), "dashboard-analytics.json");
}

function exportPDF() {
  // Trigger browser print dialog (simplest PDF path without heavy deps)
  window.print();
}

interface ExportButtonsProps {
  data: DashboardData;
}

export function ExportButtons({ data }: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(type: "pdf" | "csv" | "excel") {
    setLoading(type);
    await new Promise((r) => setTimeout(r, 500)); // brief UX delay

    try {
      if (type === "csv") exportCSV(data);
      else if (type === "excel") exportJSON(data); // JSON as fallback (no xlsx dep)
      else exportPDF();
    } finally {
      setLoading(null);
    }
  }

  const buttons = [
    { type: "pdf" as const, label: "PDF", icon: FileText, color: "#ef4444", bg: "from-red-500/20 to-red-600/10 border-red-500/30" },
    { type: "excel" as const, label: "Excel", icon: FileSpreadsheet, color: "#10b981", bg: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" },
    { type: "csv" as const, label: "CSV", icon: FileDown, color: "#3b82f6", bg: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  ];

  return (
    <div className="flex items-center gap-2">
      {buttons.map((b, i) => {
        const Icon = b.icon;
        const isLoading = loading === b.type;
        return (
          <motion.button
            key={b.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handle(b.type)}
            disabled={!!loading}
            className={`flex items-center gap-1.5 rounded-xl border bg-gradient-to-r ${b.bg} px-3 py-2 text-xs font-medium text-white transition-all duration-200 disabled:opacity-50`}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: b.color }} />
            ) : (
              <Icon className="h-3.5 w-3.5" style={{ color: b.color }} />
            )}
            {b.label}
          </motion.button>
        );
      })}
    </div>
  );
}
