'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Award, Calendar, Zap, FileText, BookOpen,
  ChevronLeft, CheckCircle2, Clock, Globe2, TrendingUp, Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface LanguageProfile {
  id: string
  name: string
  code: string
  proficiency: 'native' | 'fluent' | 'intermediate' | 'beginner'
  status: 'known' | 'learning'
  learningSince?: string
  flag: string
}

interface LearningUpdate {
  id: string
  language: string
  date: string
  content: string
  category: string
}

interface Exam {
  id: string
  language: string
  level: string
  status: 'cleared' | 'pending'
  score?: number
  totalScore?: number
  clearedDate?: string
  certificate?: string
}

const PROFICIENCY_BARS: Record<string, number> = {
  native: 100, fluent: 85, intermediate: 60, beginner: 30
}

const PROFICIENCY_GRADIENT: Record<string, string> = {
  native: 'from-purple-500 to-pink-500',
  fluent: 'from-green-500 to-emerald-500',
  intermediate: 'from-blue-500 to-cyan-500',
  beginner: 'from-yellow-500 to-orange-500'
}

const PROFICIENCY_BADGE: Record<string, string> = {
  native: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  fluent: 'bg-green-500/20 text-green-300 border-green-500/30',
  intermediate: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  beginner: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
}

const CATEGORY_COLORS: Record<string, string> = {
  Vocabulary: 'bg-blue-500/20 text-blue-300',
  Grammar: 'bg-purple-500/20 text-purple-300',
  Listening: 'bg-green-500/20 text-green-300',
  Speaking: 'bg-orange-500/20 text-orange-300',
  Reading: 'bg-cyan-500/20 text-cyan-300',
  Writing: 'bg-rose-500/20 text-rose-300',
  General: 'bg-slate-500/20 text-slate-300',
}

function ProgressBar({ pct, gradient }: { pct: number; gradient: string }) {
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
      />
    </div>
  )
}

function LanguageCard({ lang, t }: { lang: LanguageProfile; t: (k: string) => string }) {
  const isLearning = lang.status === 'learning'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-2xl border p-5 overflow-hidden group cursor-default transition-all duration-300
        ${isLearning
          ? 'border-green-500/30 bg-gradient-to-br from-green-950/40 via-slate-900/80 to-slate-900/80 hover:border-green-400/50'
          : 'border-white/10 bg-gradient-to-br from-slate-800/50 via-slate-900/80 to-slate-900/80 hover:border-white/20'
        }`}
    >
      {/* glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500
        ${isLearning ? 'bg-green-500' : 'bg-blue-500'}`} />

      <div className="relative z-10 space-y-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{lang.flag}</span>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight">{lang.name}</h3>
              <p className="text-xs text-white/40 uppercase tracking-widest">{lang.code}</p>
            </div>
          </div>
          {isLearning && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-[10px] font-semibold whitespace-nowrap">
              <TrendingUp className="w-3 h-3" /> Learning
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>{t('languages.proficiency')}</span>
            <span>{PROFICIENCY_BARS[lang.proficiency]}%</span>
          </div>
          <ProgressBar pct={PROFICIENCY_BARS[lang.proficiency]} gradient={PROFICIENCY_GRADIENT[lang.proficiency]} />
        </div>

        {/* Badge + learning since */}
        <div className="flex items-center justify-between">
          <Badge className={`${PROFICIENCY_BADGE[lang.proficiency]} border text-xs`}>
            {t(`languages.${lang.proficiency}`)}
          </Badge>
          {lang.learningSince && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Calendar className="w-3 h-3" />
              <span>{lang.learningSince}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function UpdateCard({ update }: { update: LearningUpdate }) {
  const isToday = update.date === new Date().toISOString().split('T')[0]
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`relative rounded-xl border p-4 transition-all
        ${isToday
          ? 'border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-slate-900/60'
          : 'border-white/8 bg-slate-900/50'
        }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {isToday && <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
          <span className="font-semibold text-white text-sm">{update.language}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[update.category] || CATEGORY_COLORS.General}`}>
            {update.category}
          </span>
        </div>
        <span className={`text-[11px] font-mono whitespace-nowrap ${isToday ? 'text-cyan-400' : 'text-white/30'}`}>
          {isToday ? '📅 Today' : update.date}
        </span>
      </div>
      <p className="text-white/70 text-sm leading-relaxed">{update.content}</p>
    </motion.div>
  )
}

function ExamCard({ exam, t, onViewCert }: { exam: Exam; t: (k: string) => string; onViewCert: (e: Exam) => void }) {
  const cleared = exam.status === 'cleared'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden
        ${cleared
          ? 'border-green-500/30 bg-gradient-to-br from-green-950/30 to-slate-900/80'
          : 'border-yellow-500/20 bg-gradient-to-br from-yellow-950/20 to-slate-900/80'
        }`}
    >
      {/* header strip */}
      <div className={`px-5 py-3 flex items-center justify-between border-b
        ${cleared ? 'border-green-500/20 bg-green-500/10' : 'border-yellow-500/20 bg-yellow-500/10'}`}>
        <div>
          <span className="text-white font-bold">{exam.language}</span>
          <span className="mx-2 text-white/30">·</span>
          <span className="text-white/60 text-sm font-mono">{exam.level}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border
          ${cleared
            ? 'bg-green-500/20 text-green-300 border-green-500/30'
            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
          }`}>
          {cleared
            ? <><CheckCircle2 className="w-3.5 h-3.5" />{t('common.cleared')}</>
            : <><Clock className="w-3.5 h-3.5" />{t('common.pending')}</>
          }
        </div>
      </div>

      <div className="p-5 space-y-3">
        {exam.score !== undefined && exam.totalScore !== undefined && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/50">
              <span>{t('languages.score')}</span>
              <span className="font-semibold text-white">{exam.score}/{exam.totalScore}</span>
            </div>
            <ProgressBar
              pct={Math.round((exam.score / exam.totalScore) * 100)}
              gradient="from-green-500 to-emerald-400"
            />
          </div>
        )}

        {exam.clearedDate && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Calendar className="w-3.5 h-3.5" />
            <span>{exam.clearedDate}</span>
          </div>
        )}

        {exam.certificate && cleared && (
          <Button
            onClick={() => onViewCert(exam)}
            size="sm"
            className="w-full mt-1 gap-2 bg-green-600 hover:bg-green-500 text-white"
          >
            <FileText className="w-4 h-4" />
            {t('languages.certificate_link')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

export function LanguagesContent() {
  const { t } = useLanguage()
  const [languages, setLanguages] = useState<LanguageProfile[]>([])
  const [updates, setUpdates] = useState<LearningUpdate[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [certDialog, setCertDialog] = useState<{ open: boolean; exam?: Exam }>({ open: false })
  const [showAllUpdates, setShowAllUpdates] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [l, u, e] = await Promise.all([
          fetch('/api/languages/profile').then(r => r.ok ? r.json() : []),
          fetch('/api/languages/updates').then(r => r.ok ? r.json() : []),
          fetch('/api/languages/exams').then(r => r.ok ? r.json() : []),
        ])
        setLanguages(l)
        setUpdates(u)
        setExams(e)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  const knownLanguages = languages.filter(l => l.status === 'known')
  const learningLanguages = languages.filter(l => l.status === 'learning')
  const today = new Date().toISOString().split('T')[0]
  const todayUpdates = updates.filter(u => u.date === today)
  const pastUpdates = updates.filter(u => u.date !== today)
  const visiblePast = showAllUpdates ? pastUpdates : pastUpdates.slice(0, 4)
  const clearedExams = exams.filter(e => e.status === 'cleared')
  const pendingExams = exams.filter(e => e.status === 'pending')

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
            <Globe2 className="absolute inset-0 m-auto w-7 h-7 text-cyan-400" />
          </div>
          <p className="text-white/40 text-sm">Loading languages…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-28 pb-20">

        {/* Back Button */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-white/50 hover:text-white/80">
              <ChevronLeft className="w-4 h-4" /> Back to Portfolio
            </Button>
          </Link>
        </motion.div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-6">
            <Globe2 className="w-4 h-4" />
            <span>Multilingual Portfolio</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-tight">
            <span className="text-white">{t('languages.title').split('&')[0]}</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400">
              {t('languages.title').includes('&') ? '& ' + t('languages.title').split('&')[1] : ''}
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            {t('languages.description')}
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{languages.length}</div>
              <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">Total Languages</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{learningLanguages.length}</div>
              <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">Currently Learning</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">{clearedExams.length}</div>
              <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">Exams Cleared</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{updates.length}</div>
              <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">Learning Entries</div>
            </div>
          </div>
        </motion.div>

        {/* ── TODAY'S LEARNING ──────────────────────────────────── */}
        {todayUpdates.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('languages.daily_updates')}</h2>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-cyan-400 font-mono">{today}</span>
            </div>
            <div className="space-y-3">
              {todayUpdates.map(u => <UpdateCard key={u.id} update={u} />)}
            </div>
          </motion.section>
        )}

        {/* ── KNOWN LANGUAGES ──────────────────────────────────── */}
        {knownLanguages.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('languages.known')}</h2>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-white/30 font-mono">{knownLanguages.length} languages</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {knownLanguages.map(lang => (
                <LanguageCard key={lang.id} lang={lang} t={t} />
              ))}
            </div>
          </motion.section>
        )}

        {/* ── LEARNING LANGUAGES ───────────────────────────────── */}
        {learningLanguages.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-green-500/20 border border-green-500/30">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('languages.learning')}</h2>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-green-400 font-mono">{learningLanguages.length} in progress</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {learningLanguages.map(lang => (
                <LanguageCard key={lang.id} lang={lang} t={t} />
              ))}
            </div>
          </motion.section>
        )}

        {/* ── PAST UPDATES ─────────────────────────────────────── */}
        {pastUpdates.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Learning Journal</h2>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-white/30">{pastUpdates.length} entries</span>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {visiblePast.map(u => <UpdateCard key={u.id} update={u} />)}
              </AnimatePresence>
            </div>
            {pastUpdates.length > 4 && (
              <button
                onClick={() => setShowAllUpdates(v => !v)}
                className="mt-4 w-full py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 text-sm transition-colors"
              >
                {showAllUpdates ? 'Show Less' : `Show ${pastUpdates.length - 4} More Entries`}
              </button>
            )}
          </motion.section>
        )}

        {/* ── EXAMS & CERTIFICATES ─────────────────────────────── */}
        {exams.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('languages.exams')}</h2>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-white/30">{clearedExams.length}/{exams.length} cleared</span>
            </div>

            {/* Cleared exams */}
            {clearedExams.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-green-400/70 mb-3">✓ Cleared</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clearedExams.map(exam => (
                    <ExamCard key={exam.id} exam={exam} t={t} onViewCert={(e) => setCertDialog({ open: true, exam: e })} />
                  ))}
                </div>
              </div>
            )}

            {/* Pending exams */}
            {pendingExams.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400/70 mb-3">⏳ Upcoming / In Progress</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingExams.map(exam => (
                    <ExamCard key={exam.id} exam={exam} t={t} onViewCert={(e) => setCertDialog({ open: true, exam: e })} />
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* Empty state */}
        {languages.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌍</div>
            <p className="text-white/40">Languages will appear here once added.</p>
          </div>
        )}

        {/* No today updates notice (if languages exist) */}
        {todayUpdates.length === 0 && languages.length > 0 && learningLanguages.length > 0 && (
          <div className="mb-8 p-4 rounded-xl border border-white/8 bg-white/3 text-center text-white/30 text-sm">
            {t('languages.no_updates')} — Check back later!
          </div>
        )}

      </div>

      {/* Certificate Dialog */}
      <Dialog open={certDialog.open} onOpenChange={(o) => setCertDialog({ ...certDialog, open: o })}>
        <DialogContent className="max-w-2xl bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{t('languages.certificate_link')}</DialogTitle>
            <DialogDescription className="text-white/50">
              {certDialog.exam?.language} — Level {certDialog.exam?.level}
            </DialogDescription>
          </DialogHeader>
          {certDialog.exam?.certificate && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-white/10">
                <img
                  src={certDialog.exam.certificate}
                  alt="Certificate"
                  className="w-full object-contain"
                />
              </div>
              <Button asChild className="w-full bg-green-600 hover:bg-green-500 gap-2">
                <a href={certDialog.exam.certificate} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4" />
                  Open Full Certificate
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
