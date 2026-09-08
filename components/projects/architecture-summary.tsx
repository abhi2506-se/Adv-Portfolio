'use client'

import { motion } from 'framer-motion'
import { Layers, Database, Shield, Server, Code2, Cpu, Package, GitBranch, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ReactFlowArchitecture } from '@/components/projects/react-flow-arch'
import type { ProjectAnalysis } from '@/types/projects'

export function ArchitectureSummary({ analysis }: { analysis: ProjectAnalysis }) {
  const { architecture: arch, techStack, keyFeatures } = analysis

  const sections = [
    {
      icon: Layers,
      title: 'Frontend',
      color: 'from-blue-600 to-cyan-500',
      items: [
        { label: 'Framework', value: arch.frontend.framework },
        { label: 'Styling', value: arch.frontend.styling.join(', ') || 'CSS' },
        { label: 'State', value: arch.frontend.stateManagement },
        { label: 'Build', value: arch.frontend.buildTool },
        ...(arch.frontend.testing.length ? [{ label: 'Testing', value: arch.frontend.testing.join(', ') }] : []),
      ].filter(i => i.value && i.value !== 'Unknown' && i.value !== 'None'),
    },
    {
      icon: Server,
      title: 'Backend',
      color: 'from-emerald-600 to-teal-500',
      items: [
        { label: 'Framework', value: arch.backend.framework },
        { label: 'Language', value: arch.backend.language },
        { label: 'Runtime', value: arch.backend.runtime },
        { label: 'API Style', value: arch.apis.style },
      ].filter(i => i.value && i.value !== 'Unknown' && i.value !== 'None'),
    },
    {
      icon: Database,
      title: 'Database',
      color: 'from-amber-600 to-orange-500',
      items: [
        { label: 'Type', value: arch.database.type },
        { label: 'Database', value: arch.database.name },
        { label: 'ORM', value: arch.database.orm },
        { label: 'Migrations', value: arch.database.migrations ? 'Yes' : 'No' },
      ].filter(i => i.value && i.value !== 'Unknown' && i.value !== 'None'),
    },
    {
      icon: Shield,
      title: 'Authentication',
      color: 'from-red-600 to-rose-500',
      items: [
        { label: 'Strategy', value: arch.authentication.strategy.join(', ') },
        { label: 'Providers', value: arch.authentication.providers.join(', ') || 'Custom' },
        { label: 'Session', value: arch.authentication.sessionManagement },
      ].filter(i => i.value && i.value !== 'Unknown' && i.value !== 'None'),
    },
    {
      icon: Cpu,
      title: 'DevOps',
      color: 'from-violet-600 to-purple-500',
      items: [
        { label: 'Hosting', value: arch.devops.hosting },
        { label: 'Container', value: arch.devops.containerization },
        { label: 'CI/CD', value: arch.devops.cicd.join(', ') || 'None' },
      ].filter(i => i.value && i.value !== 'Unknown' && i.value !== 'None'),
    },
    {
      icon: Package,
      title: 'Package Manager',
      color: 'from-pink-600 to-fuchsia-500',
      items: [
        { label: 'Manager', value: arch.packageManager },
        ...(arch.patterns.length ? [{ label: 'Patterns', value: arch.patterns.slice(0, 3).join(', ') }] : []),
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Tech stack chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-secondary/30 border border-border rounded-xl p-5"
      >
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-blue-400" />
          Tech Stack
        </h3>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech, i) => (
            <motion.div
              key={tech}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Badge variant="secondary" className="text-xs">
                {tech}
              </Badge>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Architecture graph */}
      <ReactFlowArchitecture arch={analysis.architecture} />

      {/* Key features */}
      {keyFeatures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-secondary/30 border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-green-400" />
            Key Features
          </h3>
          <ul className="space-y-2">
            {keyFeatures.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                className="flex items-start gap-2 text-sm"
              >
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{f}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Architecture sections grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ icon: Icon, title, color, items }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="bg-secondary/30 border border-border rounded-xl p-4 hover:border-border/80 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-semibold text-sm">{title}</h4>
            </div>
            <div className="space-y-2">
              {items.map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className="text-xs font-medium text-right max-w-[60%] break-words">{value}</span>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground/50 italic">Not detected</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cache info */}
      <p className="text-xs text-muted-foreground/40 text-right">
        Analyzed {new Date(analysis.analyzedAt).toLocaleString()}
        {analysis.cached ? ' · From cache' : ' · Fresh analysis'}
      </p>
    </div>
  )
}
