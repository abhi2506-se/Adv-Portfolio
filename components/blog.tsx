'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { BookOpen, Clock, Tag, ExternalLink, Rss, TrendingUp, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface BlogPost {
  id: string
  title: string
  summary: string
  tags: string[]
  read_time: string
  date_label: string
  url: string
  color: string
  icon: string
  trending: boolean
  published: boolean
  created_at: number
  updated_at: number
}

const defaultBlogs: BlogPost[] = [
  {
    id: '1',
    title: 'Building Scalable React Apps with Redux Toolkit: Lessons from Production',
    summary: 'How I reduced state-related bugs by 60% at Amazon by migrating from vanilla Redux to RTK — including real examples of createSlice, createAsyncThunk, and entity adapters.',
    tags: ['React', 'Redux Toolkit', 'State Management'],
    read_time: '8 min read',
    date_label: 'May 2026',
    url: '',
    color: 'from-blue-600 to-cyan-500',
    icon: '⚛️',
    trending: true,
    published: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: '2',
    title: 'From Zero to Full-Stack: My Journey Building an Alumni Portal with Next.js & Prisma',
    summary: 'A deep-dive into architecting a multi-role platform with OTP auth, real-time chat via Pusher, and an AI-powered complaint classification system using OpenAI.',
    tags: ['Next.js', 'PostgreSQL', 'Full-Stack'],
    read_time: '12 min read',
    date_label: 'Apr 2026',
    url: '',
    color: 'from-orange-600 to-red-500',
    icon: '🏗️',
    trending: true,
    published: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: '3',
    title: 'CSS Performance Optimization: How I Cut Render Time by 45% on a Dashboard',
    summary: 'Practical techniques — CSS containment, will-change budgeting, layer promotion, and critical CSS inlining — that I used to pass Core Web Vitals on a data-heavy dashboard.',
    tags: ['CSS', 'Performance', 'Web Vitals'],
    read_time: '6 min read',
    date_label: 'Mar 2026',
    url: '',
    color: 'from-green-600 to-teal-500',
    icon: '🚀',
    trending: false,
    published: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: '4',
    title: 'DevOps for Frontend Developers: Docker, GitHub Actions & Vercel in 2026',
    summary: 'A practical walkthrough of containerizing a Next.js app, setting up a CI/CD pipeline with GitHub Actions, and automating zero-downtime deployments to Vercel.',
    tags: ['DevOps', 'Docker', 'CI/CD'],
    read_time: '10 min read',
    date_label: 'Feb 2026',
    url: '',
    color: 'from-sky-600 to-blue-500',
    icon: '🐳',
    trending: false,
    published: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: '5',
    title: 'TypeScript Generics Demystified: Real Patterns I Use Every Day',
    summary: "Stop copy-pasting generic examples. Here are the 7 generic patterns I reach for most often — with code from real projects, not toy examples.",
    tags: ['TypeScript', 'JavaScript', 'Patterns'],
    read_time: '7 min read',
    date_label: 'Jan 2026',
    url: '',
    color: 'from-purple-600 to-pink-500',
    icon: '🔷',
    trending: false,
    published: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
]

function formatDate(created_at: number, updated_at?: number) {
  const ts = updated_at && updated_at > created_at ? updated_at : created_at
  if (!ts) return ''
  try {
    return new Date(Number(ts)).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return '' }
}

export function Blog() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const { t } = useLanguage()
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [usingDefault, setUsingDefault] = useState(false)

  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/portfolio-blogs', { cache: 'no-store' })
      const data = await res.json()
      if (data.blogs && data.blogs.length > 0) {
        setBlogs(data.blogs)
        setUsingDefault(false)
      } else {
        setBlogs(defaultBlogs)
        setUsingDefault(true)
      }
    } catch {
      setBlogs(defaultBlogs)
      setUsingDefault(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlogs()
    // Listen for portfolio-data-updated events
    const handler = () => fetchBlogs()
    window.addEventListener('portfolio-data-updated', handler)
    return () => window.removeEventListener('portfolio-data-updated', handler)
  }, [])

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const card = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } } }

  return (
    <motion.section
      ref={ref} id="blog"
      className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto"
      variants={container} initial="hidden" animate={inView ? 'visible' : 'hidden'}
    >
      <motion.div variants={card} className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">{t('blog.eyebrow')}</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2">
            {t('blog.title.blog')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t('blog.title.articles')}</span>
          </h2>
        </div>
        {!usingDefault && (
          <span className="flex items-center gap-1.5 text-xs text-green-500 mt-4">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {t('blog.live')}
          </span>
        )}
      </motion.div>
      <motion.p variants={card} className="text-muted-foreground text-lg mb-12 max-w-2xl">
        {t('blog.subtitle')}
      </motion.p>

      <div className="space-y-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-5 p-5 rounded-2xl border border-border bg-card animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-secondary flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-full" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ))
          : blogs.map((post, i) => (
            <motion.article
              key={post.id || i}
              variants={card}
              whileHover={{ x: 6 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="group relative flex gap-5 p-5 rounded-2xl border border-border bg-card hover:border-blue-500/30 hover:shadow-lg transition-all duration-300"
            >
              {/* Color stripe */}
              <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b ${post.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              {/* Emoji icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${post.color} flex items-center justify-center text-xl`}>
                {post.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {post.trending && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                      <TrendingUp className="w-3 h-3" /> {t('blog.trending')}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {post.read_time}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(post as any).display_date
                      ? (post as any).display_date
                      : post.date_label || (post.created_at ? formatDate(post.created_at, post.updated_at) : '')}
                  </span>
                  {post.updated_at && post.updated_at > post.created_at && (
                    <span className="text-xs text-muted-foreground/60 italic">
                      {t('blog.updated')} {formatDate(post.updated_at)}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base leading-snug mb-1.5 group-hover:text-blue-500 transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{post.summary}</p>

                <div className="flex flex-wrap items-center gap-2">
                  {(post.tags || []).map((tag: string) => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                      <Tag className="w-2.5 h-2.5" /> {tag}
                    </span>
                  ))}
                  {post.url ? (
                    <a href={post.url} target="_blank" rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors">
                      {t('blog.read_more')} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground/60 italic flex items-center gap-1">
                      <Rss className="w-3 h-3" /> {t('blog.coming_soon')}
                    </span>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
      </div>
    </motion.section>
  )
}
