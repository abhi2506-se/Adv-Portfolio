'use client'

import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Code2, Palette, Database, GitBranch, Zap, Brain, X, Clock, BarChart2 } from 'lucide-react'
import { usePortfolioData } from '@/hooks/usePortfolioData'
import { useLanguage } from '@/lib/language-context'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2, Palette, Database, GitBranch, Zap, Brain,
}

function getDefaultDetail(skill: string) {
  return { level: 75, lastUsed: 'Recently', note: `Solid hands-on experience with ${skill} in multiple projects` }
}

interface PopupPosition {
  top: number
  left: number
  width: number
}

function SkillDetailPopup({ skill, color, onClose, skillDetails, position }: {
  skill: string; color: string; onClose: () => void;
  skillDetails: Record<string, { level: number; lastUsed: string; note: string }>
  position: PopupPosition
}) {
  const detail = skillDetails[skill] ?? getDefaultDetail(skill)
  const { t } = useLanguage()

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -6 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: Math.min(position.width, 320),
          zIndex: 9999,
        }}
        className="bg-background border border-border rounded-2xl p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm">{skill}</h4>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-muted-foreground"><BarChart2 className="w-3 h-3" /> {t('skills.confidence')}</span>
            <span className="font-semibold">{detail.level}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <motion.div initial={{ width: 0 }} animate={{ width: `${detail.level}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-2 rounded-full bg-gradient-to-r ${color}`} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Clock className="w-3 h-3" />
          <span>{t('skills.last_used')} <strong className="text-foreground">{detail.lastUsed}</strong></span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{detail.note}</p>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

import { useExperienceMode } from '@/components/experience-mode'

export function Skills() {
  const data = usePortfolioData()
  const { skills } = data
  const skillDetails: Record<string, { level: number; lastUsed: string; note: string }> =
    (data as any).skillDetails ?? {}
  const { mode } = useExperienceMode()
  const { t } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<{
    name: string; color: string; position: PopupPosition
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Close popup on scroll
    const handleScroll = () => setSelectedSkill(null)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSkillClick = (e: React.MouseEvent<HTMLLIElement>, skill: string, color: string) => {
    // If same skill clicked again, deselect
    if (selectedSkill?.name === skill) {
      setSelectedSkill(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const popupHeight = 160
    const viewportHeight = window.innerHeight

    let top = rect.bottom + 8
    // Flip above if too close to bottom
    if (top + popupHeight > viewportHeight - 20) {
      top = rect.top - popupHeight - 8
    }

    setSelectedSkill({
      name: skill,
      color,
      position: {
        top,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 332)),
        width: Math.max(rect.width, 280),
      },
    })
  }

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
  const card = { hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } } }

  return (
    <>
      {mounted && selectedSkill && (
        <SkillDetailPopup
          skill={selectedSkill.name}
          color={selectedSkill.color}
          onClose={() => setSelectedSkill(null)}
          skillDetails={skillDetails}
          position={selectedSkill.position}
        />
      )}

      <motion.section id="skills" ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={container}
        className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div variants={card} className="mb-4">
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">{t('skills.eyebrow')}</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2">
            {t('skills.title.skills')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t('skills.title.expertise')}</span>
          </h2>
        </motion.div>
        <motion.p variants={card} className="text-sm text-muted-foreground mb-10">
          {t('skills.hint')}
        </motion.p>

        {/* Mode-specific skills callout */}
        {mode === 'recruiter' && (
          <motion.div variants={card} className="mb-8 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm">
            👔 <strong>Recruiter view:</strong> Core strengths are React, Next.js & TypeScript — production-ready across all. DevOps skills include Docker & CI/CD pipelines.
          </motion.div>
        )}
        {mode === 'developer' && (
          <motion.div variants={card} className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm">
            💻 <strong>Dev view:</strong> Click each skill for proficiency %, last used date & project context. Hover cards show architecture notes.
          </motion.div>
        )}
        {mode === 'client' && (
          <motion.div variants={card} className="mb-8 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300 text-sm">
            🤝 <strong>Client view:</strong> These skills directly translate to faster delivery, fewer bugs, and maintainable code — meaning lower long-term costs for you.
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {skills.map((cat, idx) => {
            const Icon = iconMap[cat.icon] ?? Code2
            const isHovered = hoveredIdx === idx
            return (
              <motion.div key={idx} variants={card} whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onHoverStart={() => setHoveredIdx(idx)} onHoverEnd={() => setHoveredIdx(null)}
                className="relative group bg-secondary border border-border rounded-2xl p-6 cursor-default">
                <motion.div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />
                <motion.div animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.5 }}
                  className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${cat.color} opacity-10 rounded-full blur-2xl pointer-events-none`} />
                <motion.div whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }}
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${cat.color} mb-4 text-white shadow-lg`}>
                  <Icon className="w-5 h-5" />
                </motion.div>
                <h3 className="text-lg font-bold mb-4 group-hover:text-blue-600 transition-colors">{cat.title}</h3>
                <ul className="space-y-2">
                  {cat.skills.map((skill, i) => {
                    const d = skillDetails[skill]
                    const label = d ? (d.level >= 90 ? t('skills.level.expert') : d.level >= 75 ? t('skills.level.mid') : t('skills.level.learning')) : null
                    const cls = d
                      ? (d.level >= 90 ? 'text-emerald-600 bg-emerald-500/10' : d.level >= 75 ? 'text-blue-600 bg-blue-500/10' : 'text-orange-600 bg-orange-500/10')
                      : ''
                    const isSelected = selectedSkill?.name === skill
                    return (
                      <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 0.3 + idx * 0.08 + i * 0.04 }}
                        onClick={(e) => handleSkillClick(e, skill, cat.color)}
                        className={`text-muted-foreground flex items-center gap-2 text-sm cursor-pointer hover:text-foreground rounded-lg px-2 py-1 -mx-2 transition-all group/skill select-none ${
                          isSelected ? 'bg-blue-500/10 text-foreground ring-1 ring-blue-500/30' : 'hover:bg-background/60'
                        }`}>
                        <motion.span animate={{ scale: isHovered ? 1.4 : 1 }}
                          className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${cat.color} flex-shrink-0`} />
                        <span className="flex-1">{skill}</span>
                        {label
                          ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold opacity-0 group-hover/skill:opacity-100 transition-opacity ${cls}`}>{label}</span>
                          : <span className="text-xs text-muted-foreground/40 opacity-0 group-hover/skill:opacity-100 transition-opacity">{t('skills.tap')}</span>
                        }
                      </motion.li>
                    )
                  })}
                </ul>
              </motion.div>
            )
          })}
        </div>
      </motion.section>
    </>
  )
}
