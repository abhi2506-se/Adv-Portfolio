'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Briefcase, BookOpen, ArrowRight, GraduationCap, MapPin } from 'lucide-react'
import { usePortfolioData } from '@/hooks/usePortfolioData'
import { useLanguage } from '@/lib/language-context'

/** Parse a period string like "Jan 2024 – Mar 2025", "2023 – Present", "Dec 2025" → end-date timestamp for sorting */
function parsePeriodEnd(period: string): number {
  if (!period) return 0
  const parts = period.split(/[-–—\/]/).map(s => s.trim())
  // Use the last (end) part, or the only part if single date
  const raw = parts.length >= 2 ? parts[parts.length - 1] : parts[0]
  if (/present|current|now/i.test(raw)) return Date.now()
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.getTime()
  // Try prepending "01 " to handle "Dec 2025" → "01 Dec 2025"
  const d2 = new Date('01 ' + raw)
  if (!isNaN(d2.getTime())) return d2.getTime()
  return 0
}

function sortByDateDesc<T extends { period?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => parsePeriodEnd(b.period || '') - parsePeriodEnd(a.period || ''))
}

export function Experience() {
  const { experience, education } = usePortfolioData()
  const { t } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const fadeLeft = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25,0.46,0.45,0.94] } } }
  const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25,0.46,0.45,0.94] } } }

  return (
    <motion.section
      id="experience"
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={container}
      className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-16">
        <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">{t('experience.eyebrow')}</span>
        <h2 className="text-4xl md:text-5xl font-bold mt-2">
          {t('experience.title.experience')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t('experience.title.education')}</span>
        </h2>
      </motion.div>

      <div className="space-y-16">
        {/* Work Experience */}
        {experience.length > 0 && (
          <div>
            <motion.h3 variants={fadeLeft} className="text-2xl font-bold mb-10 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                <Briefcase className="w-5 h-5" />
              </div>
              {t('experience.work_experience')}
            </motion.h3>

            <div className="space-y-8 relative">
              {/* Timeline line */}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{ duration: 1, delay: 0.3 }}
                style={{ originY: 0 }}
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-600 via-cyan-500 to-transparent hidden md:block"
              />

              {sortByDateDesc(experience).map((exp, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeLeft}
                  whileHover={{ x: 6 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="group relative md:pl-10 pb-8 last:pb-0"
                >
                  {/* Timeline dot */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={inView ? { scale: 1 } : {}}
                    transition={{ delay: 0.4 + idx * 0.15, type: 'spring', stiffness: 300 }}
                    className="absolute -left-3.5 top-1 w-7 h-7 rounded-full bg-blue-600 border-4 border-background hidden md:flex items-center justify-center shadow-lg shadow-blue-600/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </motion.div>

                  {/* Card */}
                  <div className="bg-secondary border border-border rounded-2xl p-6 group-hover:border-blue-600/40 group-hover:shadow-lg group-hover:shadow-blue-600/5 transition-all duration-300">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                      <div>
                        <h4 className="text-xl font-bold group-hover:text-blue-600 transition-colors">{exp.title}</h4>
                        <p className="text-muted-foreground font-semibold mt-0.5">{exp.company}</p>
                        {((exp as any).city || (exp as any).state || (exp as any).country) && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {[(exp as any).city, (exp as any).state, (exp as any).country].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className="text-xs font-medium text-muted-foreground bg-background px-3 py-1.5 rounded-full border border-border whitespace-nowrap"
                      >
                        {exp.period}
                      </motion.span>
                    </div>

                    <ul className="space-y-2.5">
                      {exp.description.map((desc, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={inView ? { opacity: 1, x: 0 } : {}}
                          transition={{ delay: 0.5 + idx * 0.1 + i * 0.05 }}
                          className="text-muted-foreground flex gap-3 text-sm leading-relaxed"
                        >
                          <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{desc}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div>
            <motion.h3 variants={fadeLeft} className="text-2xl font-bold mb-10 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              {t('experience.education_heading')}
            </motion.h3>

            <div className="grid md:grid-cols-2 gap-5">
              {sortByDateDesc(education).map((edu, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="group bg-secondary border border-border rounded-2xl p-6 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold group-hover:text-purple-600 transition-colors leading-tight">{edu.title}</h4>
                      <p className="text-muted-foreground font-medium text-sm mt-1">{edu.institution}</p>
                      <p className="text-muted-foreground/70 text-xs italic mt-0.5">{edu.description}</p>
                      {((edu as any).city || (edu as any).state || (edu as any).country) && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground/60 mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {[(edu as any).city, (edu as any).state, (edu as any).country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground bg-background px-2.5 py-1 rounded-full border border-border whitespace-nowrap flex-shrink-0">
                      {edu.period}
                    </span>
                  </div>

                  <ul className="space-y-1.5">
                    {edu.achievements.map((a, i) => (
                      <li key={i} className="text-muted-foreground text-sm flex gap-2 items-start">
                        <span className="text-purple-500 mt-0.5 flex-shrink-0">◆</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  )
}
