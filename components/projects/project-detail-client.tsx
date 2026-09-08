'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Github, ExternalLink, Star, GitFork, Users, Code2,
  Loader2, RefreshCw, AlertCircle, Cpu, Database, Shield, Server,
  ChevronRight, BarChart3, MessageSquare, BookOpen, Layers,
  Target, Lightbulb, TrendingUp, CheckCircle, Zap, Package,
  FileText, Download, Presentation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ProjectAnalysis } from '@/types/projects'

// Lazy-load heavy sub-panels only when analysis is available
import { DiagramViewer }        from '@/components/projects/diagram-viewer'
import { GitHubAnalyticsPanel } from '@/components/projects/github-analytics'
import { ProjectAIChat }        from '@/components/projects/project-ai-chat'
import { FolderTree }           from '@/components/projects/folder-tree'
import { ArchitectureSummary }  from '@/components/projects/architecture-summary'
import { DataDictionary }       from '@/components/projects/data-dictionary'
import ProjectMediaShowcase     from '@/components/project-media-showcase'

interface CaseStudy {
  problem?: string
  solution?: string
  results?: string[]
  metrics?: { users?: string; improvement?: string; timeSaved?: string }
}

interface ProjectDetailClientProps {
  project: {
    name:            string
    description:     string
    longDescription?: string
    github?:         string
    repoUrl?:        string
    live?:           string
    liveUrl?:        string
    image?:          string
    tags?:           string[]
    tech?:           string[]
    features?:       string[]
    featured?:       boolean
    status?:         string
    caseStudy?:      CaseStudy | null
    synopsisUrl?:    string
    pptUrl?:         string
    reportUrl?:      string
  }
  slug: string
}

// ─── Gradient pill ────────────────────────────────────────────────────────────
function GradientBadge({ label }: { label: string; key?: string }) {
  const colors: Record<string, string> = {
    'Next.js':     'bg-foreground/10 text-foreground',
    'React':       'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    'React.js':    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    'TypeScript':  'bg-blue-700/15 text-blue-700 dark:text-blue-300',
    'Node.js':     'bg-green-500/15 text-green-600 dark:text-green-400',
    'MongoDB':     'bg-green-700/15 text-green-700 dark:text-green-300',
    'Python':      'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
    'Django':      'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300',
    'PostgreSQL':  'bg-sky-600/15 text-sky-700 dark:text-sky-300',
    'Tailwind CSS':'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    'Docker':      'bg-blue-600/15 text-blue-700 dark:text-blue-300',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-current/20 ${colors[label] || 'bg-secondary text-muted-foreground'}`}>
      {label}
    </span>
  )
}

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${color}`}>
      <p className="text-2xl font-black tabular-nums leading-none mb-1">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  )
}

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-xl" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <h3 className="font-bold text-base text-foreground">{title}</h3>
    </div>
  )
}

// ─── Overview tab — the always-visible rich content ──────────────────────────
function OverviewTab({ project, slug }: { project: ProjectDetailClientProps['project']; slug: string }) {
  const tags      = project.tags || project.tech || []
  const features  = project.features || []
  const cs        = project.caseStudy

  return (
    <div className="space-y-8">
      {/* Media Showcase — shows admin-uploaded media first */}
      <ProjectMediaShowcase projectId={slug} />

      {/* Tech Stack */}
      {tags.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SectionHead icon={Code2} title="Tech Stack" color="#3b82f6" />
          <div className="flex flex-wrap gap-2">
            {tags.map(t => <GradientBadge key={t} label={t} />)}
          </div>
        </motion.div>
      )}

      {/* Features */}
      {features.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionHead icon={Zap} title="Key Features" color="#10b981" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15"
              >
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground leading-relaxed">{f}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Case Study */}
      {cs && (
        <>
          {/* Problem */}
          {cs.problem && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <SectionHead icon={Target} title="Problem Statement" color="#ef4444" />
              <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{cs.problem}</p>
              </div>
            </motion.div>
          )}

          {/* Solution */}
          {cs.solution && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <SectionHead icon={Lightbulb} title="Solution & Architecture" color="#f59e0b" />
              <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{cs.solution}</p>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {cs.results && cs.results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <SectionHead icon={TrendingUp} title="Results & Impact" color="#8b5cf6" />
              <div className="space-y-2">
                {cs.results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/15"
                  >
                    <ChevronRight className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">{r}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Metrics */}
          {cs.metrics && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <SectionHead icon={BarChart3} title="Key Metrics" color="#06b6d4" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cs.metrics.users       && <MetricCard value={cs.metrics.users}       label="Users / Scale"      color="border-cyan-500/20 bg-cyan-500/5 text-cyan-700 dark:text-cyan-300" />}
                {cs.metrics.improvement && <MetricCard value={cs.metrics.improvement} label="Key Improvement"    color="border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-300" />}
                {cs.metrics.timeSaved   && <MetricCard value={cs.metrics.timeSaved}   label="Time / Efficiency"  color="border-violet-500/20 bg-violet-500/5 text-violet-700 dark:text-violet-300" />}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Document links */}
      {(project.synopsisUrl || project.pptUrl || project.reportUrl) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <SectionHead icon={FileText} title="Project Documents" color="#6b7280" />
          <div className="flex flex-wrap gap-3">
            {project.synopsisUrl && (
              <a href={project.synopsisUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-secondary/30 text-sm hover:bg-secondary/60 transition-colors">
                <Download className="w-4 h-4" /> Synopsis PDF
              </a>
            )}
            {project.pptUrl && (
              <a href={project.pptUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-secondary/30 text-sm hover:bg-secondary/60 transition-colors">
                <Presentation className="w-4 h-4" /> Presentation
              </a>
            )}
            {project.reportUrl && (
              <a href={project.reportUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-secondary/30 text-sm hover:bg-secondary/60 transition-colors">
                <FileText className="w-4 h-4" /> Report
              </a>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── README Viewer ────────────────────────────────────────────────────────────
function ReadmeViewer({ readme }: { readme: string }) {
  if (!readme) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
        <BookOpen className="w-10 h-10 opacity-40" />
        <p>No README found in this repository.</p>
      </div>
    )
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-secondary/30 border border-border rounded-xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold">README.md</h3>
      </div>
      <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground leading-relaxed overflow-auto max-h-[600px]">
        {readme}
      </pre>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProjectDetailClient({ project, slug }: ProjectDetailClientProps) {
  const [analysis, setAnalysis]   = useState<ProjectAnalysis | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const repoUrl = project.github || project.repoUrl || ''
  const liveUrl = project.live   || project.liveUrl  || ''
  const hasRepo = !!repoUrl && repoUrl.includes('github.com')

  const analyze = async (force = false) => {
    if (!hasRepo || loading) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, projectSlug: slug, force }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Unable to analyze this repository. Please try again.')
      }
      setAnalysis(await res.json())
    } catch (e) {
      const msg = (e as Error).message || 'Unable to fetch GitHub data. This may be temporary.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasRepo && !analysis) analyze()
  }, [hasRepo]) // eslint-disable-line react-hooks/exhaustive-deps

  const tags = project.tags || project.tech || []
  const gh   = analysis?.githubAnalytics

  // Build tabs: All tabs always visible; content shows skeleton/loading until analysis loads
  const analysisAvailable = !!analysis
  const allTabs = [
    { value: 'overview', icon: BarChart3,    label: 'Overview',   always: true  },
    { value: 'diagrams', icon: Layers,       label: 'Diagrams',   always: true  },
    { value: 'github',   icon: Github,       label: 'Analytics',  always: true  },
    { value: 'database', icon: Database,     label: 'Database',   always: true  },
    { value: 'files',    icon: BookOpen,     label: 'Files',      always: true  },
    { value: 'readme',   icon: Code2,        label: 'README',     always: true  },
    { value: 'chat',     icon: MessageSquare,label: 'AI Chat',    always: true  },
  ]
  const visibleTabs = allTabs.filter(t => t.always || analysisAvailable)

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <Link href="/#projects">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Projects
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate text-sm md:text-base">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasRepo && (
              <Button variant="outline" size="sm" onClick={() => analyze(true)} disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span className="hidden sm:inline">{loading ? 'Analyzing…' : 'Analyse'}</span>
              </Button>
            )}
            {liveUrl && liveUrl !== '#' && (
              <Button size="sm" className="gap-1.5" asChild>
                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">Live</span>
                </a>
              </Button>
            )}
            {repoUrl && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                  <Github className="w-3 h-3" />
                  <span className="hidden sm:inline">Code</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-wrap items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h2 className="text-3xl md:text-4xl font-extrabold">{project.name}</h2>
                {project.featured && (
                  <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">⭐ Featured</Badge>
                )}
                <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400">
                  {project.status || 'Completed'}
                </Badge>
              </div>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-3xl">
                {project.longDescription || project.description}
              </p>
            </div>
          </div>

          {/* Tech tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map(t => <GradientBadge key={t} label={t} />)}
            </div>
          )}

          {/* GitHub quick stats (only when analysis loaded) */}
          {gh && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-5 pt-3 border-t border-border/40">
              {[
                { icon: Star,  label: 'Stars',        value: gh.stars },
                { icon: GitFork, label: 'Forks',      value: gh.forks },
                { icon: Users, label: 'Contributors',  value: gh.contributorCount },
                { icon: Code2, label: 'Languages',     value: gh.languagePercentages?.length ?? 0 },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-foreground">{value}</span>
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid mb-8 h-auto ${visibleTabs.length <= 2 ? 'grid-cols-2' : visibleTabs.length <= 4 ? 'grid-cols-4' : 'grid-cols-3 md:grid-cols-7'}`}>
            {visibleTabs.map(({ value, icon: Icon, label }) => (
              <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 text-xs py-2">
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.slice(0, 3)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview — always visible, shows full rich content */}
          <TabsContent value="overview">
            <OverviewTab project={project} slug={slug} />

            {/* Loading indicator for analysis (shown below overview content) */}
            {loading && !analysis && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 flex items-center gap-4">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <Cpu className="absolute inset-0 m-auto w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">Fetching GitHub Analysis…</p>
                  <p className="text-xs text-muted-foreground">Parsing repository, detecting architecture, building diagrams. This may take 15–30 seconds.</p>
                </div>
              </motion.div>
            )}

            {/* Error notice for analysis */}
            {error && !loading && hasRepo && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">GitHub analysis currently unavailable</p>
                  <p className="text-xs text-muted-foreground mt-0.5">We couldn't fetch the repository details at this moment. This might be due to API rate limits or network issues.</p>
                </div>
                <Button onClick={() => analyze()} variant="outline" size="sm" className="flex-shrink-0 text-xs border-amber-500/30">
                  Retry
                </Button>
              </motion.div>
            )}
          </TabsContent>

          {/* Analysis-powered tabs — always rendered, show loading/error state when needed */}
          <TabsContent value="diagrams">
            {analysis ? (
              <DiagramViewer diagrams={analysis.diagrams} projectName={project.name} />
            ) : (
              <AnalysisLoadingPlaceholder loading={loading} error={error} hasRepo={hasRepo} onRetry={() => analyze(true)} label="Diagrams" />
            )}
          </TabsContent>
          <TabsContent value="github">
            {analysis ? (
              <GitHubAnalyticsPanel analytics={analysis.githubAnalytics} repoUrl={repoUrl} />
            ) : (
              <AnalysisLoadingPlaceholder loading={loading} error={error} hasRepo={hasRepo} onRetry={() => analyze(true)} label="GitHub Analytics" />
            )}
          </TabsContent>
          <TabsContent value="database">
            {analysis ? (
              <DataDictionary models={analysis.diagrams.dataDictionary} />
            ) : (
              <AnalysisLoadingPlaceholder loading={loading} error={error} hasRepo={hasRepo} onRetry={() => analyze(true)} label="Database" />
            )}
          </TabsContent>
          <TabsContent value="files">
            {analysis ? (
              <FolderTree nodes={analysis.fileTree} />
            ) : (
              <AnalysisLoadingPlaceholder loading={loading} error={error} hasRepo={hasRepo} onRetry={() => analyze(true)} label="Files" />
            )}
          </TabsContent>
          <TabsContent value="readme">
            {analysis ? (
              <ReadmeViewer readme={analysis.readme} />
            ) : (
              <AnalysisLoadingPlaceholder loading={loading} error={error} hasRepo={hasRepo} onRetry={() => analyze(true)} label="README" />
            )}
          </TabsContent>
          <TabsContent value="chat">
            {analysis ? (
              <ProjectAIChat analysis={analysis} projectName={project.name} />
            ) : (
              <AnalysisLoadingPlaceholder loading={loading} error={error} hasRepo={hasRepo} onRetry={() => analyze(true)} label="AI Chat" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Analysis Loading Placeholder ────────────────────────────────────────────
function AnalysisLoadingPlaceholder({
  loading, error, hasRepo, onRetry, label,
}: {
  loading: boolean; error: string | null; hasRepo: boolean; onRetry: () => void; label: string
}) {
  if (!hasRepo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-foreground mb-1">No GitHub Repository Linked</p>
          <p className="text-sm text-muted-foreground">Add a GitHub URL to this project to enable {label}.</p>
        </div>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <Cpu className="absolute inset-0 m-auto w-5 h-5 text-blue-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm mb-1">Analyzing Repository…</p>
          <p className="text-xs text-muted-foreground">Fetching {label.toLowerCase()} data from GitHub</p>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500/60" />
        <div>
          <p className="font-semibold text-foreground mb-1">Analysis Unavailable</p>
          <p className="text-sm text-muted-foreground max-w-sm">Could not fetch GitHub data. This may be due to API rate limits or a private repository.</p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      <p className="text-sm text-muted-foreground">Loading {label}…</p>
    </div>
  )
}
