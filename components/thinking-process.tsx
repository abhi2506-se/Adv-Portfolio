'use client'

import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, PenTool, Code2, Rocket, Figma, Github, Globe,
  ArrowRight, ChevronDown, ChevronUp, Zap, Target, Users, Shield,
} from 'lucide-react'

const WORKFLOW_STEPS = [
  {
    id: 1,
    icon: Lightbulb,
    label: 'Discover',
    color: 'from-yellow-500 to-orange-500',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    title: 'Understand the Problem First',
    description:
      'Before writing a single line of code, I dig into the why. Who is the user? What pain are we solving? I start with questions — not answers. Research, competitive analysis, and user empathy mapping.',
    details: [
      'User research & persona building',
      'Competitor analysis (what works, what doesn\'t)',
      'Defining success metrics upfront',
      'Spotting edge cases before they bite',
    ],
  },
  {
    id: 2,
    icon: PenTool,
    label: 'Design',
    color: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-500/10 border-purple-500/20',
    title: 'Wireframe → Prototype → Validate',
    description:
      'I don\'t jump to pixel-perfect. I sketch rough flows in Figma first. Test the logic, not the aesthetics. A confused wireframe means a confused product — I catch that early.',
    details: [
      'Low-fidelity wireframes (Figma)',
      'Component hierarchy planning',
      'Responsive-first layout decisions',
      'Micro-interaction mapping',
    ],
  },
  {
    id: 3,
    icon: Code2,
    label: 'Build',
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Build Systems, Not Just Features',
    description:
      'I write code that future-me won\'t curse at. Clean component architecture, proper state management, and API design that scales. Each PR is small, intentional, and reviewable.',
    details: [
      'Component-first architecture (React)',
      'TypeScript for self-documenting code',
      'Custom hooks for reusable logic',
      'Performance budgets from day one',
    ],
  },
  {
    id: 4,
    icon: Rocket,
    label: 'Deploy',
    color: 'from-green-500 to-teal-500',
    bg: 'bg-green-500/10 border-green-500/20',
    title: 'Ship Fast, Iterate Faster',
    description:
      'CI/CD pipelines, Vercel previews, and staged rollouts. I treat every deployment like a product launch — check metrics, watch error logs, and be ready to hotfix in minutes.',
    details: [
      'Vercel / Netlify for instant previews',
      'GitHub Actions for CI/CD automation',
      'Lighthouse CI for performance gates',
      'Rollback plans for every deploy',
    ],
  },
]

const TOOLS = [
  { name: 'Figma', icon: Figma, desc: 'Design & wireframing', color: 'text-purple-400' },
  { name: 'GitHub', icon: Github, desc: 'Version control & CI', color: 'text-white' },
  { name: 'VS Code', icon: Code2, desc: 'Primary IDE', color: 'text-blue-400' },
  { name: 'Vercel', icon: Globe, desc: 'Deployment platform', color: 'text-white' },
  { name: 'TypeScript', icon: Shield, desc: 'Type-safe code', color: 'text-blue-300' },
  { name: 'Framer Motion', icon: Zap, desc: 'Animations & UX', color: 'text-yellow-400' },
]

const PRINCIPLES = [
  { icon: Target, label: 'Purpose before pixels', desc: 'Every design decision has a reason tied to user goals.' },
  { icon: Users, label: 'Build for real people', desc: 'Not for demos. Real edge cases, real accessibility, real devices.' },
  { icon: Zap, label: 'Speed is a feature', desc: 'Sub-second TTI. Lazy loading. Smart caching. Always.' },
  { icon: Shield, label: 'Defensive by default', desc: 'Error states, loading states, empty states — all planned, never afterthought.' },
]

export function ThinkingProcess() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [expanded, setExpanded] = useState<number | null>(null)

  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
  }
  const item = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
  }

  return (
    <motion.section
      id="thinking"
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={container}
      className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-4">
        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
          How I Think
        </span>
        <h2 className="text-4xl md:text-5xl font-bold mt-2">
          My{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
            Thinking Process
          </span>
        </h2>
      </motion.div>
      <motion.p variants={item} className="text-base md:text-lg text-muted-foreground mb-14 max-w-2xl">
        Most portfolios show the output. Here's the input — how I actually approach building
        products that work, scale, and delight users.
      </motion.p>

      {/* Workflow Steps */}
      <div className="relative mb-16">
        {/* Connector line */}
        <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-purple-500 via-blue-500 to-green-500 opacity-20 z-0" />

        <div className="grid md:grid-cols-4 gap-4 mb-2">
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon
            const isExpanded = expanded === step.id
            return (
              <motion.div
                key={step.id}
                variants={item}
                className={`relative z-10 cursor-pointer rounded-2xl border p-5 transition-all duration-300 ${step.bg} ${
                  isExpanded ? 'md:col-span-1' : ''
                } hover:scale-[1.02]`}
                onClick={() => setExpanded(isExpanded ? null : step.id)}
              >
                {/* Step number */}
                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${step.color} mb-4 shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Step {step.id}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-bold text-foreground mb-1">{step.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description.slice(0, 80)}…</p>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-current/10">
                        <p className="text-sm text-foreground font-semibold mb-3">{step.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{step.description}</p>
                        <ul className="space-y-1.5">
                          {step.details.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-current opacity-60" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
        <motion.p variants={item} className="text-xs text-center text-muted-foreground mt-3">
          Click any step to expand ↑
        </motion.p>
      </div>

      {/* Design Principles */}
      <motion.div variants={item} className="mb-16">
        <h3 className="text-xl font-bold mb-6 text-foreground">
          Principles I{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
            refuse to skip
          </span>
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div
                key={i}
                variants={item}
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-secondary border border-border hover:border-blue-600/30 transition-colors group"
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">{p.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Toolbox */}
      <motion.div variants={item}>
        <h3 className="text-xl font-bold mb-6 text-foreground">
          My{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
            Toolbox
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon
            return (
              <motion.div
                key={i}
                variants={item}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-secondary border border-border hover:border-purple-600/30 hover:shadow-lg hover:shadow-purple-600/5 transition-all cursor-default"
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${tool.color}`} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Closing statement */}
      <motion.div
        variants={item}
        className="mt-14 p-7 rounded-2xl bg-gradient-to-br from-purple-600/10 to-pink-500/10 border border-purple-500/20 text-center"
      >
        <p className="text-base font-semibold text-foreground mb-2">
          "Good enough" is a bug, not a feature.
        </p>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Every pixel, every API call, every state edge-case — I care about them because
          users feel the difference, even when they can't articulate it.
        </p>
      </motion.div>
    </motion.section>
  )
}
