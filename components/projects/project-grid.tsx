'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, SortAsc } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/project-card'

interface Project {
  name: string
  description: string
  github?: string
  repoUrl?: string
  live?: string
  liveUrl?: string
  image?: string
  tags?: string[]
  featured?: boolean
  status?: string
  slug?: string
}

interface ProjectGridProps {
  projects: Project[]
}

const SORT_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Featured', value: 'featured' },
  { label: 'Name A-Z', value: 'name' },
]

export function ProjectGrid({ projects }: ProjectGridProps) {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [sort, setSort] = useState('default')

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    projects.forEach(p => p.tags?.forEach(t => tags.add(t)))
    return [...tags].slice(0, 12)
  }, [projects])

  const statuses = useMemo(() => {
    const s = new Set(projects.map(p => p.status).filter(Boolean))
    return [...s] as string[]
  }, [projects])

  const filtered = useMemo(() => {
    let result = [...projects]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      )
    }

    if (activeTag) {
      result = result.filter(p => p.tags?.includes(activeTag))
    }

    if (activeStatus) {
      result = result.filter(p => p.status === activeStatus)
    }

    if (sort === 'featured') result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    else if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))

    return result
  }, [projects, search, activeTag, activeStatus, sort])

  const hasFilters = search || activeTag || activeStatus || sort !== 'default'

  const clearFilters = () => {
    setSearch('')
    setActiveTag(null)
    setActiveStatus(null)
    setSort('default')
  }

  return (
    <div>
      {/* Search and filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-8 space-y-4"
      >
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="pl-9 bg-secondary border-border"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setActiveStatus(activeStatus === status ? null : status)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border
                ${activeStatus === status
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                }`}
            >
              {status}
            </button>
          ))}

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs bg-secondary border border-border text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all
                  ${activeTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-secondary/60 text-muted-foreground hover:text-foreground border border-border hover:border-blue-500/40'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span>
            {' '}of{' '}
            <span>{projects.length}</span>
            {' '}projects
          </p>
          {hasFilters && (
            <Badge variant="secondary" className="text-xs">Filtered</Badge>
          )}
        </div>
      </motion.div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground">No projects match your search.</p>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3">
              Clear filters
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filtered.map((project, i) => (
              <ProjectCard key={project.name} project={project} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
