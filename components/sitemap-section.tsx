'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Map, Home, User, Code2, Briefcase, FolderOpen, Server,
  Github, Award, BookOpen, Mail, Shield, FileText, Compass,
  BarChart3, ExternalLink, ChevronDown, ChevronRight,
} from 'lucide-react'

interface SitemapNode {
  id: string
  label: string
  url: string
  external?: boolean
  badge?: string
  desc?: string
  icon?: React.ElementType
  children?: SitemapNode[]
}

const SITEMAP_DATA: SitemapNode[] = [
  {
    id: 'home', label: 'Homepage', url: '/', icon: Home,
    desc: 'Main portfolio landing page',
    children: [
      { id: 'hero', label: '#hero — Hero & CTA', url: '/#hero', icon: User, desc: 'Title, resume download, social links' },
      { id: 'about', label: '#about — About Me', url: '/#about', icon: User, desc: 'Background, values, stats' },
      { id: 'skills', label: '#skills — Skills', url: '/#skills', icon: Code2, desc: 'Tech stack proficiency' },
      { id: 'experience', label: '#experience — Experience', url: '/#experience', icon: Briefcase, desc: 'Work history & education' },
      { id: 'projects', label: '#projects — Projects', url: '/#projects', icon: FolderOpen, desc: 'Featured projects' },
      { id: 'devops', label: '#devops — DevOps & Cloud', url: '/#devops', icon: Server, desc: 'Docker, Kubernetes, CI/CD' },
      { id: 'github', label: '#github — GitHub Stats', url: '/#github', icon: Github, desc: 'Live repos, contribution heatmap' },
      { id: 'certifications', label: '#certifications', url: '/#certifications', icon: Award, desc: 'Professional certifications' },
      { id: 'contact', label: '#contact — Contact', url: '/#contact', icon: Mail, desc: 'Contact form, WhatsApp, email' },
      { id: 'sitemap', label: '#sitemap — Sitemap', url: '/#sitemap', icon: Map, desc: 'Site structure' },
    ],
  },
  { id: 'journey', label: '/journey — Journey', url: '/journey', icon: Compass, desc: 'My personal journey, blogs & certificates' },
  { id: 'projects_page', label: '/projects — All Projects', url: '/projects', icon: FolderOpen, desc: 'Full project list' },
  {
    id: 'legal', label: 'Legal Pages', url: '#', icon: Shield,
    children: [
      { id: 'privacy', label: '/privacy-policy', url: '/privacy-policy', icon: Shield, desc: 'Privacy policy' },
      { id: 'terms', label: '/terms-of-service', url: '/terms-of-service', icon: FileText, desc: 'Terms of service' },
    ],
  },
]

function SitemapNode({ node, depth = 0 }: { node: SitemapNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)
  const Icon = node.icon || Map
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-border/40 pl-3' : ''}>
      <div className="flex items-start gap-2 py-1.5 group">
        {hasChildren && (
          <button onClick={() => setOpen(o => !o)} className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
        {!hasChildren && <span className="w-3.5" />}
        <Icon className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {node.url !== '#' ? (
              <Link href={node.url} className="text-sm font-medium text-foreground hover:text-blue-500 transition-colors">
                {node.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-foreground">{node.label}</span>
            )}
            {node.external && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
          </div>
          {node.desc && <p className="text-xs text-muted-foreground mt-0.5">{node.desc}</p>}
        </div>
      </div>
      {hasChildren && open && (
        <div className="mt-0.5">
          {node.children!.map(child => (
            <SitemapNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SitemapSection() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-1.5 rounded-lg bg-blue-600/15 border border-blue-500/20">
            <Map className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Site Map</h2>
        </div>
        <p className="text-sm text-muted-foreground">Complete structure and navigation of this portfolio</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {SITEMAP_DATA.map(node => (
          <div key={node.id} className="bg-secondary/30 border border-border rounded-xl p-4">
            <SitemapNode node={node} />
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-center"
      >
        <Link
          href="/sitemap"
          className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          View full interactive sitemap
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    </div>
  )
}
