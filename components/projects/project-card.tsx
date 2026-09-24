'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Github, ExternalLink, ChevronRight, Star, GitFork, Sparkles, Image as ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ProjectCardProps {
  project: {
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
    stars?: number
    forks?: number
  }
  index?: number
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)
  const [mediaCover, setMediaCover] = useState<string | null>(null)

  const slug = project.slug || slugify(project.name)
  const repoUrl = project.github || project.repoUrl || ''
  const liveUrl = project.live || project.liveUrl || ''
  const tags = project.tags || []

  // Fetch first uploaded media item to use as cover
  useEffect(() => {
    fetch(`/api/admin/project-media?projectId=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => {
        const items = (d.media || []).sort((a: any, b: any) => a.display_order - b.display_order)
        if (items.length > 0) {
          setMediaCover(items[0].thumbnail_url || items[0].media_url)
        }
      })
      .catch(() => {})
  }, [slug])

  const coverSrc = mediaCover || (project as any).coverImage || null
  const isGradient = project.image && !project.image.startsWith('http') && !project.image.startsWith('/')

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative bg-secondary/30 border border-border rounded-xl overflow-hidden hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
    >
      {/* Gradient hover effect */}
      <motion.div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Featured badge */}
      {project.featured && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs gap-1">
            <Star className="w-3 h-3" /> Featured
          </Badge>
        </div>
      )}

      {/* Cover image — admin uploaded media takes priority */}
      {coverSrc ? (
        <div className="h-40 overflow-hidden bg-secondary relative">
          <motion.img
            src={coverSrc}
            alt={project.name}
            className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.05 : 1 }}
            transition={{ duration: 0.4 }}
            onContextMenu={e => e.preventDefault()}
            draggable={false}
          />
          {/* Media count indicator */}
        </div>
      ) : isGradient ? (
        <div className={`h-32 bg-gradient-to-br ${project.image} flex items-center justify-center`}>
          <motion.div
            animate={{ scale: hovered ? 1.1 : 1 }}
            transition={{ duration: 0.3 }}
            className="text-4xl font-black text-white/20 select-none"
          >
            {project.name.slice(0, 2).toUpperCase()}
          </motion.div>
        </div>
      ) : project.image ? (
        <div className="h-40 overflow-hidden bg-secondary">
          <motion.img
            src={project.image}
            alt={project.name}
            className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.05 : 1 }}
            transition={{ duration: 0.4 }}
          />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-blue-950 to-purple-950 flex items-center justify-center">
          <motion.div
            animate={{ scale: hovered ? 1.1 : 1 }}
            transition={{ duration: 0.3 }}
            className="text-4xl font-black text-blue-500/20 select-none"
          >
            {project.name.slice(0, 2).toUpperCase()}
          </motion.div>
        </div>
      )}

      <div className="p-5">
        {/* Status */}
        {project.status && (
          <div className="mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border
              ${project.status === 'completed'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : project.status === 'in-progress'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {project.status}
            </span>
          </div>
        )}

        <h3 className="font-bold text-base mb-2 group-hover:text-blue-400 transition-colors">
          {project.name}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
          {project.description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
            {tags.length > 4 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                +{tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href={`/projects/${slug}`} className="flex-1">
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2 group/btn bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="w-3.5 h-3.5" />
              View Details
              <ChevronRight className="w-3.5 h-3.5 ml-auto group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
          {repoUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4" />
              </a>
            </Button>
          )}
          {liveUrl && liveUrl !== '#' && (
            <Button variant="outline" size="sm" asChild>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
