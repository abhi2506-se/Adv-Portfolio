'use client'

import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Award, ExternalLink, Calendar, Building2, ChevronDown, ShieldCheck, FileText } from 'lucide-react'
import { usePortfolioData } from '@/hooks/usePortfolioData'

const defaultCertifications = [
  {
    id: '1',
    name: 'React – The Complete Guide (incl. React Router & Redux)',
    issuer: 'Udemy',
    date: '2024',
    credentialUrl: '',
    credentialPdfUrl: '',
    badgeColor: 'from-blue-600 to-cyan-500',
    skills: ['React.js', 'Redux', 'React Router', 'Hooks'],
    expiry: '',
  },
  {
    id: '2',
    name: 'JavaScript Algorithms and Data Structures',
    issuer: 'freeCodeCamp',
    date: '2023',
    credentialUrl: '',
    credentialPdfUrl: '',
    badgeColor: 'from-yellow-500 to-orange-500',
    skills: ['JavaScript', 'Algorithms', 'Data Structures', 'ES6+'],
    expiry: '',
  },
  {
    id: '3',
    name: 'The Web Developer Bootcamp 2024',
    issuer: 'Udemy',
    date: '2024',
    credentialUrl: '',
    credentialPdfUrl: '',
    badgeColor: 'from-green-600 to-teal-500',
    skills: ['HTML5', 'CSS3', 'JavaScript', 'Node.js', 'MongoDB'],
    expiry: '',
  },
  {
    id: '4',
    name: 'Responsive Web Design Certification',
    issuer: 'freeCodeCamp',
    date: '2023',
    credentialUrl: '',
    credentialPdfUrl: '',
    badgeColor: 'from-purple-600 to-pink-500',
    skills: ['HTML', 'CSS', 'Flexbox', 'Grid', 'Accessibility'],
    expiry: '',
  },
  {
    id: '5',
    name: 'Docker & Kubernetes: The Complete Guide',
    issuer: 'Udemy',
    date: '2024',
    credentialUrl: '',
    credentialPdfUrl: '',
    badgeColor: 'from-sky-600 to-blue-500',
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'DevOps'],
    expiry: '',
  },
]

type CertType = typeof defaultCertifications[0]

export function Certifications() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const data = usePortfolioData() as any
  const certs: CertType[] = (data.certifications && data.certifications.length > 0)
    ? data.certifications
    : defaultCertifications

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const card = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } } }

  return (
    <motion.section
      ref={ref} id="certifications"
      className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto"
      variants={container} initial="hidden" animate={inView ? 'visible' : 'hidden'}
    >
      <motion.div variants={card} className="mb-4">
        <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Credentials</span>
        <h2 className="text-4xl md:text-5xl font-bold mt-2">
          Certifications &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Courses</span>
        </h2>
      </motion.div>
      <motion.p variants={card} className="text-muted-foreground text-lg mb-12 max-w-2xl">
        {certs.length}+ verified credentials from industry-recognized platforms.
      </motion.p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {certs.map((cert, i) => {
          const isOpen = expanded === (cert.id || String(i))
          return (
            <motion.div
              key={cert.id || i}
              variants={card}
              layout
              className="border border-border rounded-2xl overflow-hidden bg-card hover:border-blue-500/30 hover:shadow-lg transition-all duration-300"
            >
              {/* Badge header */}
              <div className={`h-2 bg-gradient-to-r ${cert.badgeColor}`} />

              <div className="p-5">
                {/* Icon + title */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${cert.badgeColor} text-white flex-shrink-0`}>
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug">{cert.name}</h3>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {cert.issuer}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {cert.date}
                  </span>
                  {cert.expiry && (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <ShieldCheck className="w-3 h-3" />
                      Expires {cert.expiry}
                    </span>
                  )}
                </div>

                {/* Skills toggle */}
                <button
                  onClick={() => setExpanded(isOpen ? null : (cert.id || String(i)))}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Skills covered</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {cert.skills.map((s: string) => (
                          <span key={s} className="px-2 py-0.5 bg-secondary rounded-full text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* View Certificate PDF */}
                  {cert.credentialPdfUrl && (
                    <a
                      href={cert.credentialPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r ${cert.badgeColor} text-white hover:opacity-90 transition-opacity shadow-sm`}
                    >
                      <FileText className="w-3 h-3" />
                      View Certificate
                    </a>
                  )}

                  {/* External credential link */}
                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors px-2 py-1.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Credential
                    </a>
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
