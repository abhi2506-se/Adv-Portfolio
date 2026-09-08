'use client'

/**
 * /sitemap  — Visual, interactive sitemap page.
 * All section togglers (navbar links, CTA buttons) that navigate to anchors
 * are fully reflected here with clickable links.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, ChevronRight, ExternalLink, Home, User, Code2,
  Briefcase, FolderOpen, Server, Github, Award, BookOpen,
  Quote, HelpCircle, Mail, Map, Shield, FileText, Lock,
  LayoutDashboard, Heart, Compass, BarChart3, Settings,
  Globe, Wifi, RefreshCw,
} from 'lucide-react'

const BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.host}`
  : process.env.NEXT_PUBLIC_BASE_URL || ''

// ─── Data ─────────────────────────────────────────────────────────────────────
interface SitemapNode {
  id:          string
  label:       string
  url:         string
  external?:   boolean
  badge?:      string
  badgeColor?: string
  desc?:       string
  icon?:       React.ElementType
  children?:   SitemapNode[]
}

const SITEMAP_TREE: SitemapNode[] = [
  {
    id: 'home', label: 'Homepage', url: '/', icon: Home,
    badge: 'Priority 1.0', badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    desc: 'Main portfolio landing page — all sections accessible via navbar togglers',
    children: [
      { id: 'hero',          label: '#hero — Hero & CTA',           url: '/#hero',            icon: User,         desc: 'Typewriter title, resume download, schedule interview, social links' },
      { id: 'about',         label: '#about — About Me',            url: '/#about',           icon: User,         desc: 'Background, values, stats (projects, technologies, internships, certifications)' },
      { id: 'skills',        label: '#skills — Skills',             url: '/#skills',          icon: Code2,        desc: 'Tech stack with proficiency levels — Frontend, Backend, DevOps, Tools' },
      { id: 'experience',    label: '#experience — Experience',     url: '/#experience',      icon: Briefcase,    desc: 'Amazon, Ksolves, Slash Mark internships + Education timeline' },
      { id: 'projects',      label: '#projects — Projects',        url: '/#projects',        icon: FolderOpen,   desc: 'Featured projects with AI filter, features toggle, case study' },
      { id: 'devops',        label: '#devops — DevOps & Cloud',     url: '/#devops',          icon: Server,       desc: 'Docker, Kubernetes, CI/CD, AWS, Linux, Nginx — architecture cards' },
      { id: 'github',        label: '#github — GitHub Stats',       url: '/#github',          icon: Github,       desc: 'Live repos, contribution heatmap, language usage chart, activity feed' },
      { id: 'certifications',label: '#certifications — Certs',     url: '/#certifications',  icon: Award,        desc: 'Professional certifications and badges' },
      { id: 'blog',          label: '#blog — Blog / Writing',       url: '/#blog',            icon: BookOpen,     desc: 'Technical articles, notes and learning posts' },
      { id: 'testimonials',  label: '#testimonials — Testimonials', url: '/#testimonials',    icon: Quote,        desc: 'Reviews and endorsements from colleagues and mentors' },
      { id: 'whyme',         label: '#hire — Why Hire Me',          url: '/#hire',            icon: HelpCircle,   desc: 'AI-powered value proposition tailored to recruiter / developer / client mode' },
      { id: 'analytics',     label: 'Visitor Analytics',           url: '/#analytics',       icon: BarChart3,    desc: 'Live visitor count, geo map, PowerBI-style dashboard' },
      { id: 'social',        label: 'Social Followers',            url: '/#analytics',       icon: Wifi,         desc: 'Live follower counts — GitHub, Instagram, LinkedIn, X/Twitter' },
      { id: 'contact',       label: '#contact — Contact',          url: '/#contact',         icon: Mail,         desc: 'Get in touch form, email, WhatsApp, Calendly interview link' },
    ],
  },
  {
    id: 'journey', label: 'Journey', url: '/journey', icon: Compass,
    badge: 'Public', badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    desc: 'Instagram-style personal timeline with stories, posts and achievements',
  },
  {
    id: 'dashboard', label: 'Analytics Dashboard', url: '/dashboard', icon: LayoutDashboard,
    badge: 'Public', badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    desc: 'PowerBI-style live analytics — visitors, GitHub stats, skill distribution, DevOps metrics',
  },
  {
    id: 'projects-root', label: 'Project Detail Pages', url: '/#projects', icon: FolderOpen,
    badge: 'Dynamic', badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    desc: 'Individual project case studies with problem, solution, results, GitHub analysis',
    children: [
      {
        id: 'proj-ai-resume', label: 'AI Resume Analyser',
        url: '/projects/ai-resume-analyser', icon: Code2,
        desc: 'Python · HTML · JS · MongoDB · Express — NLP-powered resume feedback',
      },
      {
        id: 'proj-alumni', label: 'Alumni Portal — Full-Stack System',
        url: '/projects/alumni-portal-full-stack-system', icon: Code2,
        desc: 'Next.js · TypeScript · PostgreSQL · Prisma · Pusher · OpenAI — real-time multi-role platform',
      },
      {
        id: 'proj-portfolio', label: 'Portfolio Website',
        url: '/projects/portfolio-website', icon: Code2,
        desc: 'Next.js · React · Tailwind · Framer Motion — this very site with CMS and AI chatbot',
      },
      {
        id: 'proj-timetable', label: 'Time-Table Management System',
        url: '/projects/time-table-management-system', icon: Code2,
        desc: 'Django · Sqlite3 · HTML · CSS · JS — conflict-aware auto-scheduling',
      },
    ],
  },
  {
    id: 'sitemap', label: 'Sitemap (this page)', url: '/sitemap', icon: Map,
    badge: 'Public', badgeColor: 'bg-secondary text-muted-foreground',
    desc: 'Full visual site map — all pages, sections, anchors, and API routes',
  },
  {
    id: 'legal', label: 'Legal', url: '/privacy-policy', icon: Shield,
    badge: 'Static', badgeColor: 'bg-secondary text-muted-foreground',
    desc: 'Legal and compliance pages',
    children: [
      { id: 'privacy', label: 'Privacy Policy',    url: '/privacy-policy',   icon: Shield,   desc: 'Data collection and processing policy' },
      { id: 'terms',   label: 'Terms of Service',  url: '/terms-of-service', icon: FileText, desc: 'Usage terms and conditions' },
    ],
  },
  {
    id: 'admin', label: 'Admin Area', url: '/admin/login', icon: Lock,
    badge: 'Protected', badgeColor: 'bg-red-500/15 text-red-700 dark:text-red-400',
    desc: 'Auth-gated CMS — not indexed by search engines',
    children: [
      { id: 'admin-login', label: 'Admin Login',      url: '/admin/login',     icon: Lock,     desc: 'OTP-based secure admin login' },
      { id: 'admin-dash',  label: 'Admin Dashboard',  url: '/admin/dashboard', icon: Settings, desc: 'Manage content, settings, social media, messages, journey' },
    ],
  },
  {
    id: 'seo', label: 'SEO & Meta Files', url: '/sitemap.xml', external: true, icon: Globe,
    badge: 'Generated', badgeColor: 'bg-green-500/15 text-green-700 dark:text-green-400',
    desc: 'Search engine and crawler auto-generated files',
    children: [
      { id: 'sitemap-xml', label: 'sitemap.xml',   url: '/sitemap.xml',  external: true,  icon: Globe,    desc: 'Next.js auto-generated XML sitemap with all project slugs' },
      { id: 'robots-txt',  label: 'robots.txt',    url: '/robots.txt',   external: true,  icon: Globe,    desc: 'Crawler rules — disallows admin & API, blocks AI training bots' },
      { id: 'manifest',    label: 'manifest.json', url: '/manifest.json', external: false, icon: Settings, desc: 'PWA web app manifest' },
    ],
  },
]

// ─── API routes list ──────────────────────────────────────────────────────────
const API_ROUTES = [
  { path: '/api/portfolio-data', method: 'GET',  desc: 'All portfolio content (hero, projects, skills, experience)' },
  { path: '/api/portfolio',      method: 'G/P',  desc: 'Raw portfolio data from DB' },
  { path: '/api/visitors',       method: 'G/P',  desc: 'Record visitor session, return live counts' },
  { path: '/api/visitor-analytics', method: 'GET', desc: 'Real-time analytics: countries, devices, OS, live feed' },
  { path: '/api/social-followers',  method: 'GET', desc: 'Live follower counts: GitHub, Instagram, LinkedIn, Twitter' },
  { path: '/api/github-activity',   method: 'GET', desc: 'GitHub repos, heatmap, language stats, activity feed' },
  { path: '/api/dashboard',      method: 'GET',  desc: 'PowerBI dashboard data — KPIs, charts, real-time' },
  { path: '/api/analytics',      method: 'GET',  desc: 'Visitor analytics aggregated' },
  { path: '/api/contact',        method: 'POST', desc: 'Contact form submission with email notification' },
  { path: '/api/ai',             method: 'POST', desc: 'AI chatbot endpoint (Claude)' },
  { path: '/api/analyze',        method: 'POST', desc: 'GitHub repo analysis — architecture, diagrams, file tree' },
  { path: '/api/testimonials',   method: 'G/P',  desc: 'Testimonials CRUD' },
  { path: '/api/legal',          method: 'GET',  desc: 'Privacy policy and terms of service content from DB' },
  { path: '/api/maintenance',    method: 'GET',  desc: 'Maintenance mode status' },
  { path: '/api/favicon',        method: 'GET',  desc: 'Dynamic favicon from DB settings' },
  { path: '/api/og',             method: 'GET',  desc: 'Open Graph image generation' },
  { path: '/api/sitemap',        method: 'GET',  desc: 'Dynamic sitemap data endpoint' },
  { path: '/api/journey/profile',    method: 'G/P', desc: 'Journey profile (name, bio, avatar)' },
  { path: '/api/journey/blogs',      method: 'G/P', desc: 'Journey blog posts' },
  { path: '/api/journey/stories',    method: 'G/P', desc: 'Journey stories (24-hour stories feature)' },
  { path: '/api/journey/follow',     method: 'G/P', desc: 'Follow/unfollow + follower count' },
  { path: '/api/journey/likes',      method: 'G/P', desc: 'Like/unlike journey posts' },
  { path: '/api/journey/certificates', method: 'G/P', desc: 'Journey certifications' },
  { path: '/api/journey/media',      method: 'POST', desc: 'Upload media for journey posts' },
  { path: '/api/auth/login',         method: 'POST', desc: 'User login' },
  { path: '/api/auth/register',      method: 'POST', desc: 'User registration' },
  { path: '/api/auth/send-otp',      method: 'POST', desc: 'Send OTP to email' },
  { path: '/api/auth/verify-otp',    method: 'POST', desc: 'Verify OTP code' },
  { path: '/api/admin/login',        method: 'POST', desc: 'Admin login' },
  { path: '/api/admin/settings',     method: 'G/P',  desc: 'Admin settings (social, SMTP, Calendly, etc.)' },
  { path: '/api/admin/notify',       method: 'POST', desc: 'Push notification to admin' },
  { path: '/api/admin/reply',        method: 'POST', desc: 'Admin reply to contact message' },
  { path: '/api/live-chat',          method: 'G/P',  desc: 'Live visitor chat with admin' },
  { path: '/api/appeal',             method: 'POST', desc: 'IP ban appeal submission' },
  { path: '/api/security/report',    method: 'POST', desc: 'CSP / security violation report' },
]

const METHOD_STYLES: Record<string, string> = {
  'GET':  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'POST': 'bg-green-500/15 text-green-600 dark:text-green-400',
  'G/P':  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

// ─── Components ───────────────────────────────────────────────────────────────
function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border border-current/20 ${color}`}>
      {text}
    </span>
  )
}

function NodeRow({ node, depth = 0 }: { node: SitemapNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)
  const hasChildren    = !!node.children?.length
  const Icon           = node.icon || Globe
  const isExternal     = node.external

  const linkContent = (
    <div className={`flex items-start gap-3 py-3 group cursor-pointer rounded-xl px-2 -mx-2 transition-colors hover:bg-secondary/40 ${depth === 0 ? 'py-3.5' : 'py-2.5'}`}>
      <div className="mt-0.5 flex-shrink-0">
        <Icon className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors ${depth === 0 ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className={`font-medium text-foreground ${depth === 0 ? 'text-sm' : 'text-[13px]'}`}>{node.label}</span>
          {node.badge && <Badge text={node.badge} color={node.badgeColor || ''} />}
          {isExternal && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
        </div>
        {node.desc && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">{node.desc}</p>
        )}
      </div>
      <code className="text-[10px] text-muted-foreground/60 font-mono bg-secondary/40 px-1.5 py-0.5 rounded shrink-0 self-start mt-0.5 max-w-[140px] truncate">
        {node.url.replace(/^https?:\/\/[^/]+/, '')}
      </code>
      {hasChildren && (
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
          className="flex-shrink-0 mt-0.5 p-0.5 rounded hover:bg-secondary/60 transition-colors text-muted-foreground">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  )

  return (
    <div>
      {isExternal
        ? <a href={node.url} target="_blank" rel="noopener noreferrer">{linkContent}</a>
        : <Link href={node.url}>{linkContent}</Link>
      }

      <AnimatePresence>
        {hasChildren && open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`overflow-hidden ${depth < 2 ? 'pl-6 ml-2 border-l border-border/50' : ''}`}
          >
            <div className="space-y-0 divide-y divide-border/30 py-1">
              {node.children!.map(child => (
                <NodeRow key={child.id} node={child} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SitemapPage() {
  const [projects, setProjects] = useState<{ title: string; slug: string }[]>([])
  const [xmlUrl,   setXmlUrl]   = useState('/sitemap.xml')

  // Dynamically fetch project slugs so if admin adds new projects they appear here too
  useEffect(() => {
    fetch('/api/portfolio-data')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.projects) return
        const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        setProjects(d.projects.map((p: any) => ({
          title: p.name || p.title || '',
          slug:  p.slug || slugify(p.name || p.title || ''),
        })))
      })
      .catch(() => {})
  }, [])

  const totalPages     = SITEMAP_TREE.reduce((n, t) => n + 1 + (t.children?.length || 0), 0)
  const totalAnchors   = SITEMAP_TREE[0].children?.length || 0

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-20">

        {/* Back link */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-3 h-3" /> Back to Portfolio
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Map className="w-5 h-5 text-blue-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black">Site Map</h1>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xl">
            Every page, section anchor, project detail page, and API route on this portfolio. All navbar togglers and in-page links are listed here — click any entry to navigate directly.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mb-2">
            {[
              { label: 'Pages',             value: totalPages,     color: 'text-blue-600 dark:text-blue-400'   },
              { label: 'Section anchors',   value: totalAnchors,   color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Project pages',     value: projects.length || 4, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'API routes',        value: `${API_ROUTES.length}+`, color: 'text-violet-600 dark:text-violet-400' },
            ].map(s => (
              <div key={s.label} className="bg-secondary/50 border border-border/60 rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className={`text-xl font-black tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main tree */}
        <div className="space-y-1 mb-12">
          {SITEMAP_TREE.map((node, i) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-border/50 bg-secondary/10 px-3 overflow-hidden"
            >
              <NodeRow node={node} depth={0} />
            </motion.div>
          ))}
        </div>

        {/* Dynamic project slugs fetched from DB */}
        {projects.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />Live Project Pages (from DB)
            </h2>
            <div className="flex flex-wrap gap-2">
              {projects.map(p => (
                <Link
                  key={p.slug}
                  href={`/projects/${p.slug}`}
                  className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline bg-blue-500/5 border border-blue-500/20 px-3 py-1.5 rounded-full transition-colors hover:bg-blue-500/10"
                >
                  /projects/{p.slug}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* API Routes */}
        <div className="mb-10">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">API Routes</h2>
          <div className="rounded-2xl border border-border/50 bg-secondary/10 divide-y divide-border/30 overflow-hidden">
            {API_ROUTES.map(route => (
              <div key={route.path} className="flex items-start gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 mt-0.5 ${METHOD_STYLES[route.method] || 'bg-secondary text-muted-foreground'}`}>
                  {route.method}
                </span>
                <code className="text-[11px] text-foreground font-mono flex-shrink-0 mt-0.5">{route.path}</code>
                <span className="text-[11px] text-muted-foreground flex-1 min-w-0">{route.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="pt-8 border-t border-border/50 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">For search engines</p>
          <div className="flex flex-wrap gap-3">
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline">
              <Globe className="w-3 h-3" /> sitemap.xml ↗
            </a>
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline">
              <Globe className="w-3 h-3" /> robots.txt ↗
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
