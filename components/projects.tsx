'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Github, ExternalLink, Code2, Sparkles, Search, Bot, X,
  Loader2, ArrowRight, Zap, CheckCircle, List, Image as ImageIcon,
  Target, Wrench, TrendingUp, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePortfolioData } from '@/hooks/usePortfolioData'
import { useExperienceMode } from '@/components/experience-mode'
import { useLanguage } from '@/lib/language-context'

function slugify(title: string) {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function Projects() {
  const { projects } = usePortfolioData()
  const { mode } = useExperienceMode()
  const { t } = useLanguage()
  const router = useRouter()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [isFiltering, setIsFiltering] = useState(false)
  const [filteredIndices, setFilteredIndices] = useState<number[] | null>(null)
  const [explaining, setExplaining] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<{ idx: number; text: string } | null>(null)
  // Features toggler — tracks which project card has features expanded
  const [featuresIdx, setFeaturesIdx] = useState<number | null>(null)
  const [caseStudyIdx, setCaseStudyIdx] = useState<number | null>(null)

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const card = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } } }

  const displayed = filteredIndices !== null ? projects.filter((_, i) => filteredIndices.includes(i)) : projects

  // ── AI-powered project filter ─────────────────────────────────────────────
  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filterQuery.trim()) { setFilteredIndices(null); return }

    const q = filterQuery.toLowerCase().trim()
    const keywords = q.split(/[\s,]+/).filter(Boolean)
    const clientMatches = projects.reduce<number[]>((acc, p, i) => {
      const haystack = `${p.title} ${p.description} ${p.tech.join(' ')}`.toLowerCase()
      if (keywords.some(k => haystack.includes(k))) acc.push(i)
      return acc
    }, [])

    if (clientMatches.length > 0) { setFilteredIndices(clientMatches); return }

    setIsFiltering(true)
    try {
      const projectList = projects.map((p, i) => `[${i}] ${p.title}: ${p.description} | Tech: ${p.tech.join(', ')}`).join('\n')
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Filter projects matching: "${filterQuery}"\n\nProjects:\n${projectList}\n\nReturn ONLY a JSON array of matching indices, like [0,2].`,
          history: [],
        }),
      })
      const data = await res.json()
      const match = data.reply?.match(/\[[\d,\s]*\]/)
      if (match) {
        const indices = JSON.parse(match[0]) as number[]
        setFilteredIndices(indices.filter(i => i >= 0 && i < projects.length))
      } else {
        setFilteredIndices([])
      }
    } catch { setFilteredIndices(null) } finally { setIsFiltering(false) }
  }

  // ── AI explain ──────────────────────────────────────────────────────────
  const handleExplain = async (project: typeof projects[0], idx: number) => {
    if (explanation?.idx === idx) { setExplanation(null); return }
    setExplaining(idx)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Explain this project to a recruiter in 3–4 sentences covering: what problem it solves, the tech stack, and why it shows strong engineering skills.\n\nProject: ${project.title}\nDescription: ${project.description}\nTech: ${project.tech.join(', ')}`,
          history: [],
        }),
      })
      const data = await res.json()
      setExplanation({ idx, text: data.reply || 'Could not generate explanation.' })
    } catch {
      setExplanation({ idx, text: 'Error loading explanation. Please try again.' })
    } finally { setExplaining(null) }
  }

  // Project features (use project's own features array if present)
  const getFeatures = (project: typeof projects[0]): string[] => {
    const f = (project as any).features
    if (Array.isArray(f) && f.length > 0) return f
    return [
      'Responsive design with mobile-first approach',
      'Clean, accessible UI with keyboard navigation',
      'Optimised loading with lazy components',
      'Error boundaries and graceful degradation',
    ]
  }

  return (
    <motion.section
      ref={ref} id="projects"
      className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-24"
      variants={container} initial="hidden" animate={inView ? 'visible' : 'hidden'}
    >
      {/* Header */}
      <motion.div variants={card} className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-black mb-4">
          {t('projects.title.featured')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
            {t('projects.title.projects')}
          </span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t('projects.subtitle')}
        </p>
      </motion.div>

      {/* AI Filter */}
      <motion.form variants={card} onSubmit={handleFilter}
        className="flex gap-2 mb-10 max-w-md mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={filterQuery} onChange={e => setFilterQuery(e.target.value)}
            placeholder={t('projects.filter.placeholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600/50"
          />
        </div>
        <Button type="submit" size="sm" disabled={isFiltering} className="gap-1.5 px-4">
          {isFiltering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isFiltering ? t('projects.filter.searching') : t('projects.filter.filter')}
        </Button>
        {filteredIndices !== null && (
          <Button type="button" variant="outline" size="sm"
            onClick={() => { setFilteredIndices(null); setFilterQuery('') }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </motion.form>

      {filteredIndices !== null && filteredIndices.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-12 text-muted-foreground">
          {t('projects.filter.no_results')} &quot;{filterQuery}&quot;.{' '}
          <button onClick={() => { setFilteredIndices(null); setFilterQuery('') }}
            className="text-blue-600 hover:underline ml-1">{t('projects.filter.show_all')}</button>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {displayed.map((project, _displayIdx) => {
          const idx = projects.indexOf(project)
          const coverImg = (project as any).coverImage as string | undefined
          const hasCover = !!coverImg

          return (
            <motion.div key={idx} variants={card} whileHover={{ y: -8, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onHoverStart={() => setHoveredIdx(idx)} onHoverEnd={() => setHoveredIdx(null)}
              className="group bg-secondary border border-border rounded-2xl overflow-hidden
                         hover:border-blue-600/30 hover:shadow-xl hover:shadow-blue-600/5
                         transition-all duration-300 card-depth flex flex-col">

              {/* Project cover / banner */}
              {hasCover ? (
                <div className="h-44 relative overflow-hidden">
                  <img src={coverImg} alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
              ) : (
                <div className={`h-44 bg-gradient-to-br ${project.image} relative overflow-hidden`}>
                  <motion.div animate={hoveredIdx === idx ? { opacity: 0.4, scale: 1.05 } : { opacity: 0.2, scale: 1 }}
                    transition={{ duration: 0.4 }} className="absolute inset-0 bg-black" />
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div animate={hoveredIdx === idx ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }} transition={{ duration: 0.4 }}>
                      <Code2 className="w-14 h-14 text-white/40" />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {hoveredIdx === idx && (
                      <>{[[-20,-20],[20,-10],[-15,15],[25,20]].map(([dx,dy],i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }} transition={{ delay: i*0.05 }} className="absolute"
                          style={{ top: `calc(50% + ${dy}px)`, left: `calc(50% + ${dx}px)` }}>
                          <Sparkles className="w-4 h-4 text-white/60" />
                        </motion.div>
                      ))}</>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1 gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-xl font-bold group-hover:text-blue-600 transition-colors duration-200">{project.title}</h3>
                    {(project as any).featured && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-600 rounded-full font-bold shrink-0 border border-orange-500/20">
                        <Zap className="w-2.5 h-2.5" /> {t('projects.featured_badge')}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-sm">{project.description}</p>
                </div>

                {/* ── Case Study panel ── */}
                <AnimatePresence>
                  {caseStudyIdx === idx && (project as any).caseStudy && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border border-orange-500/20 rounded-2xl p-4 space-y-3">
                        {/* Problem */}
                        <div>
                          <p className="text-xs font-bold text-orange-600 mb-1 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" /> {t('projects.case_study.problem')}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{(project as any).caseStudy.problem}</p>
                        </div>
                        {/* Solution */}
                        <div>
                          <p className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5" /> {t('projects.case_study.solution')}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{(project as any).caseStudy.solution}</p>
                        </div>
                        {/* Results */}
                        <div>
                          <p className="text-xs font-bold text-emerald-600 mb-1.5 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" /> {t('projects.case_study.results')}
                          </p>
                          {(project as any).caseStudy.results.map((r: string, ri: number) => (
                            <div key={ri} className="flex items-start gap-2 text-xs text-muted-foreground mb-1">
                              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Features toggler panel (all projects) ── */}
                <AnimatePresence>
                  {featuresIdx === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5
                                      border border-blue-500/20 rounded-2xl p-4 space-y-2">
                        <p className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1.5">
                          <List className="w-3.5 h-3.5" /> {t('projects.features.key_features')}
                        </p>
                        {getFeatures(project).map((f, fi) => (
                          <div key={fi} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Explanation */}
                <AnimatePresence>
                  {explanation?.idx === idx && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 overflow-hidden">
                      <p className="text-xs font-semibold text-blue-600 mb-1.5 flex items-center gap-1"><Bot className="w-3 h-3" /> {t('projects.ai.explanation')}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{explanation.text}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tech tags */}
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, i) => (
                    <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ delay: 0.4 + idx * 0.1 + i * 0.04 }} whileHover={{ scale: 1.1 }}
                      className="text-xs px-2.5 py-1 bg-background rounded-full text-muted-foreground border border-border hover:border-blue-600/40 hover:text-blue-600 transition-colors cursor-default">
                      {tech}
                    </motion.span>
                  ))}
                </div>

                {/* Action buttons — always at bottom due to flex-col + mt-auto */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border mt-auto">
                  {/* View Project */}
                  <Button size="sm" variant="outline"
                    onClick={() => router.push(`/projects/${slugify(project.title)}`)}
                    className="gap-1.5 text-xs bg-transparent hover:bg-blue-600/10 hover:text-blue-600 hover:border-blue-600/30 flex-1 group">
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    {t('projects.btn.view')}
                  </Button>

                  {/* Case Study — only for projects that have one */}
                  {(project as any).caseStudy && (
                    <Button size="sm"
                      variant={caseStudyIdx === idx ? 'default' : 'outline'}
                      onClick={() => setCaseStudyIdx(caseStudyIdx === idx ? null : idx)}
                      className={`gap-1.5 text-xs transition-all ${
                        caseStudyIdx === idx
                          ? 'bg-orange-600 hover:bg-orange-700 border-orange-600 text-white'
                          : 'bg-transparent hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/30'
                      }`}>
                      <Target className="w-3.5 h-3.5" />
                      {caseStudyIdx === idx ? t('projects.btn.hide') : t('projects.btn.case_study')}
                    </Button>
                  )}

                  {/* Features toggler — ALL projects */}
                  <Button size="sm"
                    variant={featuresIdx === idx ? 'default' : 'outline'}
                    onClick={() => setFeaturesIdx(featuresIdx === idx ? null : idx)}
                    className={`gap-1.5 text-xs transition-all ${
                      featuresIdx === idx
                        ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                        : 'bg-transparent hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30'
                    }`}>
                    <List className="w-3.5 h-3.5" />
                    {featuresIdx === idx ? t('projects.btn.hide') : t('projects.btn.features')}
                  </Button>

                  {/* AI Explain */}
                  <Button size="sm" variant="outline"
                    onClick={() => handleExplain(project, idx)}
                    disabled={explaining === idx}
                    className="gap-1.5 text-xs bg-transparent hover:bg-secondary">
                    {explaining === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                    {explanation?.idx === idx ? t('projects.btn.hide') : t('projects.btn.explain')}
                  </Button>

                  {/* GitHub */}
                  <Button asChild size="sm" variant="outline" className="gap-1.5 bg-transparent hover:bg-secondary">
                    <a href={project.github} target="_blank" rel="noopener noreferrer"><Github className="w-3.5 h-3.5" /></a>
                  </Button>

                  {/* Live */}
                  {project.live && project.live !== '#' && (
                    <Button asChild size="sm" className="gap-1.5 shadow-md shadow-blue-600/10">
                      <a href={project.live} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
