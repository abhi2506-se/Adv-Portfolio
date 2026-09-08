// ─── Dashboard Types ─────────────────────────────────────────────────────────

export interface KPIMetric {
  id: string;
  label: string;
  value: number | string;
  change: number;
  changeLabel: string;
  icon: string;
  color: string;
  gradient: string;
  suffix?: string;
  prefix?: string;
  sparkline?: number[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface VisitorData {
  date: string;
  visitors: number;
  unique: number;
  pageViews: number;
  sessions: number;
}

export interface TrafficSource {
  name: string;
  value: number;
  color: string;
}

export interface DeviceData {
  name: string;
  value: number;
  color: string;
}

export interface BrowserData {
  browser: string;
  users: number;
  sessions: number;
}

export interface ProjectData {
  name: string;
  views: number;
  clicks: number;
}

export interface CountryData {
  country: string;
  code: string;
  visitors: number;
  flag: string;
}

export interface HeatmapData {
  hour: number;
  day: string;
  value: number;
}

export interface RecruiterData {
  visits: number;
  companies: number;
  resumeDownloads: number;
  topSkills: { skill: string; views: number }[];
  topProjects: { project: string; views: number }[];
  journey: { stage: string; count: number; percent: number }[];
}

export interface RealTimeData {
  activeUsers: number;
  onlineVisitors: number;
  feed: LiveFeedItem[];
  recentActivities: Activity[];
}

export interface LiveFeedItem {
  id: string;
  country: string;
  flag: string;
  page: string;
  time: string;
  device: string;
}

export interface Activity {
  id: string;
  type: "view" | "download" | "contact" | "github" | "linkedin";
  description: string;
  time: string;
}

export interface GitHubMetrics {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  totalCommits: number;
  contributions: number;
  topLanguages: { language: string; percent: number; color: string }[];
  repoMetrics: { name: string; stars: number; forks: number; watchers: number }[];
}

export interface DevOpsMetrics {
  deployments: number;
  buildSuccessRate: number;
  cicdStatus: "passing" | "failing" | "pending";
  uptime: number;
  apiResponseTime: number;
  lighthouseScore: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

export interface AIInsights {
  mostViewedProject: string;
  mostSearchedSkill: string;
  recruiterInterestScore: number;
  portfolioPerformanceScore: number;
  monthlyGrowthRate: number;
  recommendation: string;
}

export interface DashboardData {
  kpis: KPIMetric[];
  visitorTrend: VisitorData[];
  monthlyGrowth: ChartDataPoint[];
  trafficSources: TrafficSource[];
  deviceUsage: DeviceData[];
  browserStats: BrowserData[];
  projectPopularity: ProjectData[];
  countryData: CountryData[];
  heatmap: HeatmapData[];
  recruiter: RecruiterData;
  realTime: RealTimeData;
  github: GitHubMetrics;
  devops: DevOpsMetrics;
  aiInsights: AIInsights;
  lastUpdated: string;
}
