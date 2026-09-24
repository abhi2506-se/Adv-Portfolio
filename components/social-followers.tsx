'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Github, Linkedin, Twitter, Instagram, RefreshCw, ExternalLink, Wifi } from 'lucide-react'

interface Followers {
  github: number; instagram: number; linkedin: number; twitter: number
  instagramUsername: string; instagramLive: boolean; fetchedAt: number
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function timeAgo(ts: number): string {
  const diff = Math.round((Date.now() - ts) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

const PLATFORMS = [
  {
    key:    'github' as keyof Omit<Followers, 'fetchedAt' | 'instagramUsername' | 'instagramLive'>,
    label:  'GitHub',
    Icon:   Github,
    color:  '#a3a3a3',
    bg:     'bg-neutral-500/10',
    border: 'border-neutral-500/25',
    href:   'https://github.com/abhi2506-se',
    live:   true, // always live via API
  },
  {
    key:    'instagram' as keyof Omit<Followers, 'fetchedAt' | 'instagramUsername' | 'instagramLive'>,
    label:  'Instagram',
    Icon:   Instagram,
    color:  '#e1306c',
    bg:     'bg-rose-500/10',
    border: 'border-rose-500/25',
    href:   'https://www.instagram.com/_abhiiisheksingh/',
    live:   null, // dynamic — read from instagramLive
  },
  {
    key:    'linkedin' as keyof Omit<Followers, 'fetchedAt' | 'instagramUsername' | 'instagramLive'>,
    label:  'LinkedIn',
    Icon:   Linkedin,
    color:  '#0077b5',
    bg:     'bg-sky-500/10',
    border: 'border-sky-500/25',
    href:   'https://www.linkedin.com/in/abhishek-singh-494a86270/',
    live:   false,
  },
  {
    key:    'twitter' as keyof Omit<Followers, 'fetchedAt' | 'instagramUsername' | 'instagramLive'>,
    label:  'X / Twitter',
    Icon:   Twitter,
    color:  '#1d9bf0',
    bg:     'bg-blue-500/10',
    border: 'border-blue-500/25',
    href:   'https://twitter.com',
    live:   false,
  },
]

export function SocialFollowers() {
  const [data, setData]       = useState<Followers | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (forceRefresh = false) => {
    const url = forceRefresh ? '/api/social-followers?refresh=1' : '/api/social-followers'
    const r = await fetch(url).catch(() => null)
    if (r?.ok) { setData(await r.json()) }
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLATFORMS.map((p, i) => {
          const isLive = p.live === null ? data?.instagramLive : p.live
          return (
            <motion.a
              key={p.key}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.03, y: -2 }}
              className={`flex flex-col gap-2 rounded-2xl border ${p.border} ${p.bg} p-4 transition-all group`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p.Icon className="w-4 h-4" style={{ color: p.color }} />
                  <span className="text-[11px] text-muted-foreground font-semibold">{p.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isLive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Live data" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Manually set" />
                  )}
                  <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {loading ? (
                <div className="h-8 w-20 rounded-lg bg-secondary animate-pulse" />
              ) : (
                <p className="text-3xl font-black tabular-nums" style={{ color: p.color }}>
                  {data ? formatCount(data[p.key]) : '—'}
                </p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">Followers</p>
                {isLive && (
                  <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">● Live</span>
                )}
              </div>
            </motion.a>
          )
        })}
      </div>

      {/* Refresh + last updated */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{data ? `Updated ${timeAgo(data.fetchedAt)}` : 'Loading...'}</span>
        <button
          onClick={() => { setRefreshing(true); load(true) }}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {data && !data.instagramLive && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-1.5">
          ⚠ Instagram live fetch currently restricted by platform. Set fallback count in Admin → Settings → Social Media.
        </p>
      )}
    </div>
  )
}
