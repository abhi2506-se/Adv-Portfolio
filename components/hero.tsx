'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Github, Linkedin, Mail, Download, Instagram,
  Sparkles, Facebook, Calendar, Phone, Star,
  ChevronDown, Terminal, Zap, Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePortfolioData } from '@/hooks/usePortfolioData'
import { getJourneyProfile } from '@/lib/journey-store'
import { useExperienceMode } from '@/components/experience-mode'
import { ScheduleModal } from '@/components/schedule-modal'
import { useLanguage } from '@/lib/language-context'

// ─── Animated grid background ────────────────────────────────────────────────
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(to right, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
    </div>
  )
}

// ─── Floating orb ────────────────────────────────────────────────────────────
function Orb({ x, y, size, color, blur, delay }: { x: string; y: string; size: number; color: string; blur: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color, filter: `blur(${blur}px)` }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15], x: [0, 15, 0], y: [0, -10, 0] }}
      transition={{ duration: 7 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// ─── Typewriter ──────────────────────────────────────────────────────────────
function Typewriter({ texts, className = '' }: { texts: string[]; className?: string }) {
  const [idx, setIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [charIdx, setCharIdx] = useState(0)

  useEffect(() => {
    const current = texts[idx]
    let t: ReturnType<typeof setTimeout>
    if (!deleting && charIdx < current.length) {
      t = setTimeout(() => { setDisplayed(current.slice(0, charIdx + 1)); setCharIdx(c => c + 1) }, 55)
    } else if (!deleting && charIdx === current.length) {
      t = setTimeout(() => setDeleting(true), 2200)
    } else if (deleting && charIdx > 0) {
      t = setTimeout(() => { setDisplayed(current.slice(0, charIdx - 1)); setCharIdx(c => c - 1) }, 30)
    } else if (deleting && charIdx === 0) {
      setDeleting(false)
      setIdx(i => (i + 1) % texts.length)
    }
    return () => clearTimeout(t)
  }, [charIdx, deleting, idx, texts])

  return (
    <span className={className}>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-0.5 h-[1em] bg-blue-500 ml-0.5 align-middle"
      />
    </span>
  )
}

// ─── Cursor glow ─────────────────────────────────────────────────────────────
function CursorGlow() {
  const x = useMotionValue(0); const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 60, damping: 18 })
  const sy = useSpring(y, { stiffness: 60, damping: 18 })
  useEffect(() => {
    const m = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY) }
    window.addEventListener('mousemove', m)
    return () => window.removeEventListener('mousemove', m)
  }, [x, y])
  return (
    <motion.div className="fixed pointer-events-none z-0 w-80 h-80 rounded-full hidden md:block"
      style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
  )
}

// ─── Stat pill ───────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-secondary/30 backdrop-blur-sm">
      <div className="p-1 rounded-md" style={{ background: `${color}18` }}>
        <Icon className="w-3 h-3" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
        <p className="text-[9px] text-muted-foreground leading-none mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export function Hero() {
  const { hero } = usePortfolioData()
  const { mode } = useExperienceMode()
  const { t } = useLanguage()
  const ROLE_TEXTS = [
    t('hero.role.1'), t('hero.role.2'),
    t('hero.role.3'), t('hero.role.4'),
    t('hero.role.5'), t('hero.role.6'),
  ]
  const [mainProfileUrl, setMainProfileUrl] = useState('')
  const [mounted, setMounted] = useState(false)
  const [githubFollowers, setGithubFollowers] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    getJourneyProfile().then(p => { if (p?.mainProfileUrl) setMainProfileUrl(p.mainProfileUrl) })
    fetch('/api/social-followers').then(r => r.json())
      .then(d => { if (d.github) setGithubFollowers(d.github) }).catch(() => {})
  }, [])

  const initials = hero.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }
  const item = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } } }

  const ctaButtons = [
    {
      href: hero.resumeUrl || '/Cv.pdf',
      label: t('hero.cta.resume'),
      icon: <Download className="w-4 h-4" />,
      variant: 'default' as const,
      external: true,
      className: 'shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0',
    },
    {
      href: 'https://calendly.com/abhisheksingh89208',
      label: t('hero.cta.schedule'),
      icon: <Calendar className="w-4 h-4" />,
      variant: 'outline' as const,
      external: true,
      className: 'border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/5',
    },
    {
      href: '#contact',
      label: t('hero.cta.hire'),
      icon: <ArrowRight className="w-4 h-4" />,
      variant: 'outline' as const,
      external: false,
      className: 'border-border/60 hover:border-foreground/40',
    },
  ]

  return (
    <section className="relative min-h-screen flex flex-col justify-start overflow-hidden pt-20 pb-16">
      <GridBackground />
      <CursorGlow />

      {/* Ambient orbs */}
      <Orb x="5%" y="15%" size={400} color="rgba(59,130,246,0.12)" blur={80} delay={0} />
      <Orb x="70%" y="60%" size={300} color="rgba(6,182,212,0.08)" blur={80} delay={2} />
      <Orb x="80%" y="10%" size={200} color="rgba(139,92,246,0.06)" blur={60} delay={4} />
      <Orb x="20%" y="75%" size={250} color="rgba(16,185,129,0.06)" blur={70} delay={1} />

      <motion.div
        initial="hidden"
        animate={mounted ? 'visible' : 'hidden'}
        variants={container}
        className="relative z-10 max-w-5xl w-full mx-auto px-4 md:px-6 lg:px-8 mt-2"
      >
        {/* ── Availability badge ── */}
        {hero.available && (
          <motion.div variants={item} className="mb-6">
            <motion.div whileHover={{ scale: 1.03 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/25 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 tracking-wide">Open to opportunities · Full-time & Contract</span>
              <Sparkles className="w-3 h-3 text-green-500" />
            </motion.div>
          </motion.div>
        )}

        {/* ── Avatar + Name ── */}
        <motion.div variants={item} className="flex items-center gap-5 md:gap-7 mb-6">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="relative flex-shrink-0 w-20 h-20 md:w-28 md:h-28"
          >
            <div className="w-full h-full rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-0.5 shadow-xl shadow-blue-500/25">
              <div className="w-full h-full rounded-2xl md:rounded-[22px] bg-background overflow-hidden">
                {mainProfileUrl
                  ? <img src={mainProfileUrl} alt={hero.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="font-black text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-cyan-500">{initials}</span>
                    </div>
                }
              </div>
            </div>
            {hero.available && (
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background shadow-lg" />
            )}
            {/* GitHub followers badge */}
            {githubFollowers !== null && (
              <div className="absolute -top-2 -right-2 bg-background border border-border/60 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-foreground shadow-sm flex items-center gap-0.5">
                <Github className="w-2.5 h-2.5" />
                {githubFollowers}
              </div>
            )}
          </motion.div>

          <div>
            <motion.p variants={item} className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
              {t('hero.greeting')}
            </motion.p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none">
              <span className="text-foreground">{hero.name.split(' ')[0]}</span>{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500">
                {hero.name.split(' ').slice(1).join(' ')}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
              {(hero as any).currentJob || t('hero.default_job')} · {(hero as any).education || t('hero.default_education')} · {(hero as any).currentLocation || t('hero.default_location')}
            </p>
          </div>
        </motion.div>

        {/* ── Typewriter title ── */}
        <motion.div variants={item} className="mb-4">
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-muted-foreground">
            {t('hero.im')}{' '}
            <Typewriter
              texts={ROLE_TEXTS}
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500"
            />
          </p>
        </motion.div>

        {/* ── Subtitle ── */}
        <motion.p variants={item} className="text-sm sm:text-base md:text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
          {hero.subtitle || t('hero.default_subtitle')}
        </motion.p>

        {/* ── CTA buttons ── */}
        <motion.div variants={item} className="flex flex-wrap gap-3 mb-10">
          {ctaButtons.map((btn, i) => (
            btn.href === 'https://calendly.com/abhisheksingh89208' ? (
              <ScheduleModal key={i} defaultType="interview" trigger={
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" variant={btn.variant}
                    className={`gap-2 h-11 px-5 font-semibold text-sm rounded-xl cursor-pointer ${btn.className}`}>
                    {btn.icon}{btn.label}
                  </Button>
                </motion.div>
              } />
            ) : (
              <motion.div key={i} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button asChild size="lg" variant={btn.variant}
                  className={`gap-2 h-11 px-5 font-semibold text-sm rounded-xl ${btn.className}`}>
                  <a href={btn.href} {...(btn.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {btn.icon}{btn.label}
                  </a>
                </Button>
              </motion.div>
            )
          ))}
        </motion.div>

        {/* ── Experience mode panel ── */}
        <AnimatePresence>
          {mode && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className={`mb-8 rounded-2xl border p-5 text-sm max-w-2xl overflow-hidden ${{
                recruiter: 'bg-blue-500/8 border-blue-500/20',
                developer: 'bg-emerald-500/8 border-emerald-500/20',
                client:    'bg-orange-500/8 border-orange-500/20',
              }[mode]}`}
            >
              {mode === 'recruiter' && (
                <div className="space-y-2">
                  <p className="font-bold text-blue-600 dark:text-blue-400 text-base">👔 Recruiter View</p>
                  <p className="text-muted-foreground">✅ <strong className="text-foreground">Actively seeking</strong> full-time SWE / DevOps roles — available immediately</p>
                  <p className="text-muted-foreground">🏆 <strong className="text-foreground">Amazon intern</strong> with 3+ years building production React & Node.js apps</p>
                  <p className="text-muted-foreground">⚙️ <strong className="text-foreground">DevOps proficiency</strong> — Docker, GitHub Actions, CI/CD, Linux, AWS basics</p>
                  <p className="text-muted-foreground">📧 <a href="#contact" className="text-blue-600 underline font-medium">Contact</a> · <a href="https://calendly.com/abhisheksingh89208" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">Schedule Interview</a></p>
                </div>
              )}
              {mode === 'developer' && (
                <div className="space-y-2">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base">💻 Tech Stack</p>
                  <p className="text-muted-foreground">🔧 <strong className="text-foreground">Frontend:</strong> React 18, Next.js 15, TypeScript, Tailwind CSS, Framer Motion</p>
                  <p className="text-muted-foreground">⚙️ <strong className="text-foreground">Backend:</strong> Node.js, Express, PostgreSQL, MongoDB, REST & GraphQL</p>
                  <p className="text-muted-foreground">☁️ <strong className="text-foreground">DevOps:</strong> Docker, GitHub Actions, CI/CD pipelines, AWS EC2/S3, Linux</p>
                  <p className="text-muted-foreground">📂 <a href="#projects" className="text-emerald-600 underline font-medium">View Projects</a> for architecture deep-dives</p>
                </div>
              )}
              {mode === 'client' && (
                <div className="space-y-2">
                  <p className="font-bold text-orange-600 dark:text-orange-400 text-base">🤝 Working With Me</p>
                  <p className="text-muted-foreground">🚀 <strong className="text-foreground">Fast delivery</strong> — MVPs in 2–4 weeks with Agile methodology</p>
                  <p className="text-muted-foreground">📊 <strong className="text-foreground">Outcome-focused</strong> — clear milestones, transparent progress updates</p>
                  <p className="text-muted-foreground">💬 <a href="#contact" className="text-orange-600 underline font-medium">Let's discuss your project</a></p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Social links ── */}
        <motion.div variants={item} className="flex items-center gap-1 pt-6 border-t border-border/50 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2 font-medium">{t('hero.connect')}</span>
          {[
            { href: hero.github, icon: Github, label: 'GitHub', color: 'hover:text-foreground' },
            { href: hero.linkedin, icon: Linkedin, label: 'LinkedIn', color: 'hover:text-blue-600' },
            { href: hero.email ? `mailto:${hero.email}` : null, icon: Mail, label: 'Email', color: 'hover:text-red-500' },
            { href: hero.instagram, icon: Instagram, label: 'Instagram', color: 'hover:text-rose-500' },
            { href: (hero as any).facebook || null, icon: Facebook, label: 'Facebook', color: 'hover:text-blue-500' },
          ].filter(s => s.href).map((s, i) => (
            <motion.a key={i} href={s.href!}
              target={s.href?.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer" aria-label={s.label}
              whileHover={{ scale: 1.2, y: -3 }} whileTap={{ scale: 0.9 }}
              className={`p-2.5 rounded-xl text-muted-foreground transition-colors ${s.color} hover:bg-secondary/60`}>
              <s.icon className="w-4 h-4" />
            </motion.a>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground"
      >
        <span className="text-[10px] font-medium tracking-widest uppercase">{t('hero.scroll')}</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.div>
    </section>
  )
}
