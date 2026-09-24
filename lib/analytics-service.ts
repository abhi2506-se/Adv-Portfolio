// ─── Analytics Service & Mock Data ──────────────────────────────────────────
import type {
  DashboardData, KPIMetric, VisitorData, ChartDataPoint,
  TrafficSource, DeviceData, BrowserData, ProjectData,
  CountryData, HeatmapData, RecruiterData, RealTimeData,
  GitHubMetrics, DevOpsMetrics, AIInsights, LiveFeedItem, Activity,
} from "@/types/dashboard";

// ─── Helpers ────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function trend(base: number, points: number, variance = 0.15): number[] {
  const arr: number[] = [];
  let cur = base;
  for (let i = 0; i < points; i++) {
    cur = Math.max(0, cur + cur * (Math.random() * variance * 2 - variance));
    arr.push(Math.round(cur));
  }
  return arr;
}

// ─── KPIs ───────────────────────────────────────────────────────────────────

export function generateKPIs(): KPIMetric[] {
  return [
    {
      id: "total-visitors",
      label: "Total Visitors",
      value: 48_293,
      change: 12.4,
      changeLabel: "vs last month",
      icon: "Users",
      color: "#3b82f6",
      gradient: "from-blue-500/20 to-blue-600/5",
      sparkline: trend(3000, 12),
    },
    {
      id: "unique-visitors",
      label: "Unique Visitors",
      value: 31_847,
      change: 8.7,
      changeLabel: "vs last month",
      icon: "UserCheck",
      color: "#8b5cf6",
      gradient: "from-violet-500/20 to-violet-600/5",
      sparkline: trend(2000, 12),
    },
    {
      id: "page-views",
      label: "Total Page Views",
      value: 124_509,
      change: 18.2,
      changeLabel: "vs last month",
      icon: "Eye",
      color: "#06b6d4",
      gradient: "from-cyan-500/20 to-cyan-600/5",
      sparkline: trend(8000, 12),
    },
    {
      id: "session-duration",
      label: "Avg Session Duration",
      value: "4m 23s",
      change: 5.1,
      changeLabel: "vs last month",
      icon: "Clock",
      color: "#10b981",
      gradient: "from-emerald-500/20 to-emerald-600/5",
    },
    {
      id: "resume-downloads",
      label: "Resume Downloads",
      value: 1_284,
      change: 24.6,
      changeLabel: "vs last month",
      icon: "FileDown",
      color: "#f59e0b",
      gradient: "from-amber-500/20 to-amber-600/5",
      sparkline: trend(80, 12),
    },
    {
      id: "contact-submissions",
      label: "Contact Submissions",
      value: 347,
      change: 15.3,
      changeLabel: "vs last month",
      icon: "Mail",
      color: "#ef4444",
      gradient: "from-red-500/20 to-red-600/5",
      sparkline: trend(20, 12),
    },
    {
      id: "github-clicks",
      label: "GitHub Clicks",
      value: 5_892,
      change: 31.2,
      changeLabel: "vs last month",
      icon: "Github",
      color: "#a3a3a3",
      gradient: "from-neutral-400/20 to-neutral-500/5",
      sparkline: trend(400, 12),
    },
    {
      id: "linkedin-clicks",
      label: "LinkedIn Clicks",
      value: 3_241,
      change: 19.8,
      changeLabel: "vs last month",
      icon: "Linkedin",
      color: "#0077b5",
      gradient: "from-sky-500/20 to-sky-600/5",
      sparkline: trend(200, 12),
    },
    {
      id: "project-views",
      label: "Project Views",
      value: 22_418,
      change: 42.1,
      changeLabel: "vs last month",
      icon: "FolderOpen",
      color: "#f97316",
      gradient: "from-orange-500/20 to-orange-600/5",
      sparkline: trend(1500, 12),
    },
    {
      id: "returning-visitors",
      label: "Returning Visitors",
      value: 14_632,
      change: 7.9,
      changeLabel: "vs last month",
      icon: "Repeat",
      color: "#ec4899",
      gradient: "from-pink-500/20 to-pink-600/5",
      sparkline: trend(900, 12),
    },
  ];
}

// ─── Visitor Trend (Line Chart) ──────────────────────────────────────────────

export function generateVisitorTrend(): VisitorData[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((m, i) => ({
    date: m,
    visitors: rnd(2800 + i * 200, 4200 + i * 300),
    unique: rnd(1800 + i * 150, 2900 + i * 200),
    pageViews: rnd(8000 + i * 600, 14000 + i * 900),
    sessions: rnd(3000 + i * 220, 5000 + i * 320),
  }));
}

// ─── Monthly Growth (Area Chart) ────────────────────────────────────────────

export function generateMonthlyGrowth(): ChartDataPoint[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let base = 3000;
  return months.map((name) => {
    base = Math.round(base * (1 + (Math.random() * 0.2 - 0.05)));
    return { name, value: base, growth: rnd(2, 22) };
  });
}

// ─── Traffic Sources (Pie Chart) ────────────────────────────────────────────

export function generateTrafficSources(): TrafficSource[] {
  return [
    { name: "Organic Search", value: 38, color: "#3b82f6" },
    { name: "Direct", value: 22, color: "#8b5cf6" },
    { name: "LinkedIn", value: 16, color: "#0077b5" },
    { name: "GitHub", value: 12, color: "#a3a3a3" },
    { name: "Twitter/X", value: 7, color: "#1d9bf0" },
    { name: "Referral", value: 5, color: "#10b981" },
  ];
}

// ─── Device Usage (Donut Chart) ─────────────────────────────────────────────

export function generateDeviceUsage(): DeviceData[] {
  return [
    { name: "Desktop", value: 54, color: "#3b82f6" },
    { name: "Mobile", value: 34, color: "#8b5cf6" },
    { name: "Tablet", value: 12, color: "#06b6d4" },
  ];
}

// ─── Browser Stats (Bar Chart) ──────────────────────────────────────────────

export function generateBrowserStats(): BrowserData[] {
  return [
    { browser: "Chrome", users: 28_410, sessions: 52_800 },
    { browser: "Safari", users: 11_240, sessions: 19_600 },
    { browser: "Firefox", users: 5_320, sessions: 8_900 },
    { browser: "Edge", users: 2_840, sessions: 4_200 },
    { browser: "Opera", users: 480, sessions: 720 },
  ];
}

// ─── Project Popularity (Horizontal Bar) ────────────────────────────────────

export function generateProjectPopularity(): ProjectData[] {
  return [
    { name: "Portfolio v27", views: 8_432, clicks: 3_210 },
    { name: "E-Commerce Platform", views: 5_281, clicks: 2_040 },
    { name: "AI Chat App", views: 4_190, clicks: 1_820 },
    { name: "DevOps Dashboard", views: 2_840, clicks: 980 },
    { name: "React Component Lib", views: 1_675, clicks: 640 },
  ];
}

// ─── Country Data ────────────────────────────────────────────────────────────

export function generateCountryData(): CountryData[] {
  return [
    { country: "India", code: "IN", visitors: 18_420, flag: "🇮🇳" },
    { country: "United States", code: "US", visitors: 12_840, flag: "🇺🇸" },
    { country: "United Kingdom", code: "GB", visitors: 4_210, flag: "🇬🇧" },
    { country: "Germany", code: "DE", visitors: 2_840, flag: "🇩🇪" },
    { country: "Canada", code: "CA", visitors: 2_310, flag: "🇨🇦" },
    { country: "Australia", code: "AU", visitors: 1_840, flag: "🇦🇺" },
    { country: "Singapore", code: "SG", visitors: 1_420, flag: "🇸🇬" },
    { country: "Netherlands", code: "NL", visitors: 980, flag: "🇳🇱" },
    { country: "France", code: "FR", visitors: 840, flag: "🇫🇷" },
    { country: "Japan", code: "JP", visitors: 620, flag: "🇯🇵" },
  ];
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

export function generateHeatmap(): HeatmapData[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data: HeatmapData[] = [];
  for (const day of days) {
    for (let hour = 0; hour < 24; hour++) {
      const isWeekday = !["Sat", "Sun"].includes(day);
      const isPeak = hour >= 9 && hour <= 18;
      data.push({
        hour,
        day,
        value: isWeekday && isPeak ? rnd(40, 120) : rnd(2, 40),
      });
    }
  }
  return data;
}

// ─── Recruiter Analytics ─────────────────────────────────────────────────────

export function generateRecruiterData(): RecruiterData {
  return {
    visits: 3_842,
    companies: 287,
    resumeDownloads: 1_284,
    topSkills: [
      { skill: "React.js", views: 4_210 },
      { skill: "TypeScript", views: 3_840 },
      { skill: "Next.js", views: 3_420 },
      { skill: "Node.js", views: 2_840 },
      { skill: "PostgreSQL", views: 1_980 },
      { skill: "AWS / Cloud", views: 1_420 },
    ],
    topProjects: [
      { project: "Portfolio v27", views: 8_432 },
      { project: "E-Commerce Platform", views: 5_281 },
      { project: "AI Chat App", views: 4_190 },
      { project: "DevOps Dashboard", views: 2_840 },
    ],
    journey: [
      { stage: "Landing", count: 3_842, percent: 100 },
      { stage: "About", count: 2_912, percent: 75.8 },
      { stage: "Projects", count: 2_184, percent: 56.8 },
      { stage: "Skills", count: 1_728, percent: 44.9 },
      { stage: "Resume Download", count: 1_284, percent: 33.4 },
      { stage: "Contact", count: 347, percent: 9.0 },
    ],
  };
}

// ─── Real-Time Data ──────────────────────────────────────────────────────────

export function generateRealTimeData(): RealTimeData {
  const pages = ["/", "/projects", "/about", "/contact", "/journey", "/dashboard"];
  const countries = [
    { c: "India", f: "🇮🇳" }, { c: "USA", f: "🇺🇸" }, { c: "UK", f: "🇬🇧" },
    { c: "Germany", f: "🇩🇪" }, { c: "Canada", f: "🇨🇦" }, { c: "Australia", f: "🇦🇺" },
  ];
  const devices = ["Desktop", "Mobile", "Tablet"];

  const feed: LiveFeedItem[] = Array.from({ length: 8 }, (_, i) => {
    const ci = rnd(0, countries.length - 1);
    return {
      id: `feed-${i}`,
      country: countries[ci].c,
      flag: countries[ci].f,
      page: pages[rnd(0, pages.length - 1)],
      time: `${rnd(1, 59)}s ago`,
      device: devices[rnd(0, 2)],
    };
  });

  const activities: Activity[] = [
    { id: "1", type: "download", description: "Resume downloaded from United States", time: "2m ago" },
    { id: "2", type: "contact", description: "New contact form submission", time: "5m ago" },
    { id: "3", type: "github", description: "GitHub profile visited from Germany", time: "8m ago" },
    { id: "4", type: "view", description: "Portfolio viewed from Singapore", time: "11m ago" },
    { id: "5", type: "linkedin", description: "LinkedIn clicked from India", time: "14m ago" },
    { id: "6", type: "download", description: "Resume downloaded from UK", time: "18m ago" },
    { id: "7", type: "view", description: "Projects page viewed from Canada", time: "22m ago" },
    { id: "8", type: "github", description: "GitHub repo starred", time: "31m ago" },
  ];

  return {
    activeUsers: rnd(8, 34),
    onlineVisitors: rnd(3, 12),
    feed,
    recentActivities: activities,
  };
}

// ─── GitHub Metrics ──────────────────────────────────────────────────────────

export async function fetchGitHubMetrics(username: string): Promise<GitHubMetrics> {
  try {
    const headers: HeadersInit = {};
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers, next: { revalidate: 3600 } }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=stars`, { headers, next: { revalidate: 3600 } }),
    ]);

    if (!userRes.ok || !reposRes.ok) throw new Error("GitHub API failed");

    const user = await userRes.json();
    const repos = await reposRes.json();

    const totalStars = repos.reduce((s: number, r: { stargazers_count: number }) => s + (r.stargazers_count || 0), 0);
    const totalForks = repos.reduce((s: number, r: { forks_count: number }) => s + (r.forks_count || 0), 0);

    // Language aggregation
    const langMap: Record<string, number> = {};
    for (const repo of repos.slice(0, 20)) {
      if (repo.language) langMap[repo.language] = (langMap[repo.language] || 0) + 1;
    }
    const totalLang = Object.values(langMap).reduce((a, b) => a + b, 0);
    const langColors: Record<string, string> = {
      TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572a5",
      Go: "#00add8", Rust: "#dea584", "C++": "#f34b7d",
      Java: "#b07219", CSS: "#563d7c", HTML: "#e34c26",
    };
    const topLanguages = Object.entries(langMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([language, count]) => ({
        language,
        percent: Math.round((count / totalLang) * 100),
        color: langColors[language] || "#6366f1",
      }));

    const repoMetrics = repos.slice(0, 5).map((r: { name: string; stargazers_count: number; forks_count: number; watchers_count: number }) => ({
      name: r.name,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      watchers: r.watchers_count || 0,
    }));

    return {
      totalRepos: user.public_repos || 0,
      totalStars,
      totalForks,
      totalCommits: rnd(800, 2000), // estimate — full count needs GraphQL
      contributions: rnd(400, 1200),
      topLanguages,
      repoMetrics,
    };
  } catch {
    return getMockGitHubMetrics();
  }
}

export function getMockGitHubMetrics(): GitHubMetrics {
  return {
    totalRepos: 42,
    totalStars: 284,
    totalForks: 98,
    totalCommits: 1_847,
    contributions: 763,
    topLanguages: [
      { language: "TypeScript", percent: 42, color: "#3178c6" },
      { language: "JavaScript", percent: 24, color: "#f7df1e" },
      { language: "Python", percent: 14, color: "#3572a5" },
      { language: "CSS", percent: 10, color: "#563d7c" },
      { language: "HTML", percent: 6, color: "#e34c26" },
      { language: "Go", percent: 4, color: "#00add8" },
    ],
    repoMetrics: [
      { name: "portfolio-v27", stars: 84, forks: 31, watchers: 84 },
      { name: "ecommerce-platform", stars: 62, forks: 24, watchers: 62 },
      { name: "ai-chat-app", stars: 48, forks: 18, watchers: 48 },
      { name: "devops-dashboard", stars: 36, forks: 12, watchers: 36 },
      { name: "react-component-lib", stars: 28, forks: 9, watchers: 28 },
    ],
  };
}

// ─── DevOps Metrics ──────────────────────────────────────────────────────────

export function generateDevOpsMetrics(): DevOpsMetrics {
  return {
    deployments: 148,
    buildSuccessRate: 97.3,
    cicdStatus: "passing",
    uptime: 99.98,
    apiResponseTime: 124,
    lighthouseScore: {
      performance: 98,
      accessibility: 100,
      bestPractices: 100,
      seo: 100,
    },
  };
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

export function generateAIInsights(): AIInsights {
  return {
    mostViewedProject: "Portfolio v27",
    mostSearchedSkill: "React.js",
    recruiterInterestScore: 87,
    portfolioPerformanceScore: 94,
    monthlyGrowthRate: 18.4,
    recommendation: "Your recruiter engagement is up 24%. Consider adding a dedicated 'Open to Work' banner and updating your availability status to convert more recruiter visits into direct contacts.",
  };
}

// ─── Full Dashboard Data ─────────────────────────────────────────────────────

async function fetchRealVisitorStats() {
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const [totalRow]   = await sql`SELECT COUNT(*) AS count FROM visitor_sessions`;
    const [activeRow]  = await sql`SELECT COUNT(*) AS count FROM visitor_sessions WHERE last_active > ${fiveMinAgo}`;
    const [monthRow]   = await sql`SELECT COUNT(*) AS count FROM visitor_sessions WHERE first_visit > ${thirtyDaysAgo}`;
    const contactRows  = await sql`SELECT COUNT(*) AS count FROM contact_messages`;
    const downloadRows = await sql`SELECT COUNT(*) AS count FROM visitor_gate_log`;

    const countryRows  = await sql`
      SELECT country, COUNT(*) AS count
      FROM visitor_sessions WHERE country != ''
      GROUP BY country ORDER BY count DESC LIMIT 6`;
    const deviceRows   = await sql`
      SELECT device, COUNT(*) AS count
      FROM visitor_sessions WHERE device != ''
      GROUP BY device ORDER BY count DESC`;
    const browserRows  = await sql`
      SELECT browser, COUNT(*) AS count
      FROM visitor_sessions WHERE browser != ''
      GROUP BY browser ORDER BY count DESC`;
    const liveRows     = await sql`
      SELECT city, country, device, os, browser, page, last_active, session_id
      FROM visitor_sessions
      WHERE last_active > ${Date.now() - 10 * 60 * 1000}
      ORDER BY last_active DESC LIMIT 8`;

    const total   = parseInt(totalRow?.count  ?? "0");
    const active  = parseInt(activeRow?.count ?? "0");
    const monthly = parseInt(monthRow?.count  ?? "0");
    const contacts = parseInt(contactRows?.[0]?.count ?? "0");
    const downloads = parseInt(downloadRows?.[0]?.count ?? "0");

    return { total, active, monthly, contacts, downloads, countryRows, deviceRows, browserRows, liveRows };
  } catch {
    return null;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [github, realStats] = await Promise.all([
    fetchGitHubMetrics("abhi2506-se"),
    fetchRealVisitorStats(),
  ]);

  // Build KPIs with real data where available
  const baseKPIs = generateKPIs();
  if (realStats) {
    const kpiMap: Record<string, number | string> = {
      "total-visitors":      realStats.total,
      "unique-visitors":     Math.round(realStats.total * 0.72),
      "page-views":          realStats.total * 3,
      "contact-submissions": realStats.contacts,
      "resume-downloads":    realStats.downloads,
    };
    baseKPIs.forEach(k => {
      if (k.id in kpiMap) k.value = kpiMap[k.id];
    });
  }

  // Build real-time data from real DB rows
  let realTimeData = generateRealTimeData();
  if (realStats) {
    const flags: Record<string, string> = {
      India: "🇮🇳", USA: "🇺🇸", UK: "🇬🇧", Germany: "🇩🇪",
      Canada: "🇨🇦", Australia: "🇦🇺", Singapore: "🇸🇬",
      France: "🇫🇷", Japan: "🇯🇵", Brazil: "🇧🇷",
    };
    const feed: LiveFeedItem[] = (realStats.liveRows as any[]).map((r: any, i: number) => ({
      id: `live-${i}-${r.last_active}`,
      country: r.country || r.city || "Unknown",
      flag: flags[r.country as string] || "🌍",
      page: r.page || "/",
      time: `${Math.round((Date.now() - Number(r.last_active)) / 1000)}s ago`,
      device: r.device || "Desktop",
    }));
    realTimeData = {
      activeUsers: realStats.active,
      onlineVisitors: realStats.active,
      feed: feed.length > 0 ? feed : realTimeData.feed,
      recentActivities: realTimeData.recentActivities,
    };
  }

  // Build real device/country data from DB
  const realDeviceUsage = realStats && (realStats.deviceRows as any[]).length > 0
    ? (realStats.deviceRows as any[]).map((r: any, i: number) => ({
        name: r.device || "Unknown",
        value: parseInt(r.count),
        color: ["#3b82f6", "#8b5cf6", "#06b6d4"][i] || "#6b7280",
      }))
    : generateDeviceUsage();

  const realCountryData = realStats && (realStats.countryRows as any[]).length > 0
    ? (realStats.countryRows as any[]).map((r: any, i: number) => ({
        country: r.country || "Unknown",
        visitors: parseInt(r.count),
        percent: realStats.total > 0 ? Math.round((parseInt(r.count) / realStats.total) * 100) : 0,
        color: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"][i] || "#6b7280",
      }))
    : generateCountryData();

  return {
    kpis: baseKPIs,
    visitorTrend: generateVisitorTrend(),
    monthlyGrowth: generateMonthlyGrowth(),
    trafficSources: generateTrafficSources(),
    deviceUsage: realDeviceUsage,
    browserStats: generateBrowserStats(),
    projectPopularity: generateProjectPopularity(),
    countryData: realCountryData,
    heatmap: generateHeatmap(),
    recruiter: generateRecruiterData(),
    realTime: realTimeData,
    github,
    devops: generateDevOpsMetrics(),
    aiInsights: generateAIInsights(),
    lastUpdated: new Date().toISOString(),
  };
}
