'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Container, Server, GitBranch, Cloud, Terminal, Shield,
  Workflow, Layers, Activity, CheckCircle, ArrowRight, Zap
} from 'lucide-react'

const DEVOPS_TOOLS = [
  {
    category: 'Containerisation',
    icon: Container,
    color: '#2496ed',
    gradient: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/25',
    tools: ['Docker', 'Docker Compose', 'Container Registry', 'Multi-stage builds'],
    level: 82,
    badge: 'Proficient',
  },
  {
    category: 'Orchestration',
    icon: Layers,
    color: '#326ce5',
    gradient: 'from-indigo-500/20 to-indigo-600/5',
    border: 'border-indigo-500/25',
    tools: ['Kubernetes basics', 'Pods & Services', 'Deployments', 'Helm charts'],
    level: 65,
    badge: 'Learning',
  },
  {
    category: 'CI / CD',
    icon: Workflow,
    color: '#10b981',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/25',
    tools: ['GitHub Actions', 'Jenkins pipelines', 'Automated testing', 'Deploy workflows'],
    level: 80,
    badge: 'Proficient',
  },
  {
    category: 'Cloud (AWS)',
    icon: Cloud,
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/25',
    tools: ['EC2 instances', 'S3 storage', 'IAM & Security', 'CloudWatch logs'],
    level: 70,
    badge: 'Familiar',
  },
  {
    category: 'Linux & Shell',
    icon: Terminal,
    color: '#8b5cf6',
    gradient: 'from-violet-500/20 to-violet-600/5',
    border: 'border-violet-500/25',
    tools: ['Bash scripting', 'Process management', 'Cron jobs', 'SSH & SCP'],
    level: 78,
    badge: 'Proficient',
  },
  {
    category: 'Web Servers',
    icon: Server,
    color: '#06b6d4',
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    border: 'border-cyan-500/25',
    tools: ['Nginx reverse proxy', 'SSL/TLS certs', 'Load balancing', 'PM2 process manager'],
    level: 75,
    badge: 'Proficient',
  },
]

const WORKFLOW_STEPS = [
  { icon: GitBranch, label: 'Code Push', desc: 'Push to feature branch', color: '#3b82f6' },
  { icon: Shield,    label: 'CI Tests',  desc: 'Lint + unit test + build', color: '#10b981' },
  { icon: Container, label: 'Docker Build', desc: 'Multi-stage container image', color: '#2496ed' },
  { icon: Cloud,     label: 'Deploy',    desc: 'Push to staging → prod', color: '#f59e0b' },
  { icon: Activity,  label: 'Monitor',   desc: 'Logs, alerts, health checks', color: '#8b5cf6' },
]

const BADGE_COLORS: Record<string, string> = {
  Proficient: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  Familiar:   'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Learning:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
}

function ToolCard({ tool, index }: { tool: typeof DEVOPS_TOOLS[0]; index: number }) {
  const Icon = tool.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className={`relative rounded-2xl border ${tool.border} bg-gradient-to-br ${tool.gradient} backdrop-blur-sm p-5 overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity"
        style={{ background: tool.color, filter: 'blur(20px)', transform: 'translate(30%, -30%)' }} />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${tool.color}15`, border: `1px solid ${tool.color}30` }}>
            <Icon className="w-5 h-5" style={{ color: tool.color }} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{tool.category}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${BADGE_COLORS[tool.badge]}`}>
              {tool.badge}
            </span>
          </div>
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: tool.color }}>{tool.level}%</span>
      </div>

      <div className="w-full bg-secondary/60 rounded-full h-1.5 mb-4">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${tool.level}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: index * 0.08 + 0.3, ease: 'easeOut' }}
          className="h-1.5 rounded-full"
          style={{ background: `linear-gradient(to right, ${tool.color}, ${tool.color}aa)` }}
        />
      </div>

      <ul className="space-y-1">
        {tool.tools.map(t => (
          <li key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: tool.color }} />
            {t}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export function DevOpsSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="devops" ref={ref} className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Workflow className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">DevOps & Cloud</span>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
          Infrastructure &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Deployment</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
          Beyond just writing code — I architect, containerise, and deploy production-grade applications with automated CI/CD pipelines and cloud infrastructure.
        </p>
      </motion.div>

      {/* CI/CD Workflow diagram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-12 rounded-3xl border border-border/60 bg-secondary/20 p-6 md:p-8 overflow-x-auto"
      >
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Typical CI/CD Workflow</p>
        <div className="flex items-center gap-2 min-w-max">
          {WORKFLOW_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.label} className="flex items-center gap-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.4 + i * 0.12 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="p-3 rounded-2xl border" style={{ background: `${step.color}12`, borderColor: `${step.color}30` }}>
                    <Icon className="w-5 h-5" style={{ color: step.color }} />
                  </div>
                  <p className="text-xs font-bold text-foreground">{step.label}</p>
                  <p className="text-[10px] text-muted-foreground text-center max-w-[80px]">{step.desc}</p>
                </motion.div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={inView ? { scaleX: 1 } : {}}
                    transition={{ delay: 0.5 + i * 0.12 }}
                    className="flex items-center"
                  >
                    <div className="w-8 h-px bg-gradient-to-r from-border to-border/40" />
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEVOPS_TOOLS.map((tool, i) => <ToolCard key={tool.category} tool={tool} index={i} />)}
      </div>

      {/* Architecture philosophy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-10 rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-6 md:p-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-base">Architecture Philosophy</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { title: 'Immutable Infra', desc: 'Infrastructure as code. Never SSH to production.' },
            { title: 'Shift Left Security', desc: 'Security scanning in CI, not post-deployment.' },
            { title: 'Observability First', desc: 'Logs, metrics, alerts before users complain.' },
          ].map(p => (
            <div key={p.title} className="space-y-1">
              <p className="font-bold text-foreground text-xs uppercase tracking-wide">{p.title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
