'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Sparkles, Loader2, RefreshCw, Star, Zap, Shield, Target } from 'lucide-react'

const ICONS = [Star, Zap, Shield, Target, Sparkles]

export function WhyHireMe() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [points, setPoints] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate exactly 5 compelling "Why Hire Me" bullet points for Abhishek Singh based on his portfolio. Each point should be a single punchy sentence starting with an action verb or strong claim. Format: return ONLY a JSON array of 5 strings, no preamble, no markdown.`,
          history: [],
        }),
      })
      const data = await res.json()

      // Try JSON array parse first
      const match = data.reply?.match(/\[[\s\S]*?\]/)
      if (match) {
        try {
          const parsed = JSON.parse(match[0]) as string[]
          if (parsed.length > 0) {
            setPoints(parsed.slice(0, 5))
            setGenerated(true)
            return
          }
        } catch { /* fall through */ }
      }

      // Fallback: split by newlines if AI didn't return JSON
      const lines = data.reply
        ?.split('\n')
        .map((l: string) => l.replace(/^[\d\-\*\.\s]+/, '').trim())
        .filter((l: string) => l.length > 10)
        .slice(0, 5)
      if (lines?.length > 0) {
        setPoints(lines)
        setGenerated(true)
        return
      }
      throw new Error('No usable content')
    } catch {
      // Always show something meaningful — never a raw error
      setPoints([
        'Full-stack developer who ships production-ready code on day one.',
        'Proven AI integration skills — from chatbots to intelligent search.',
        'Strong communicator who keeps stakeholders informed at every stage.',
        'Fast learner who picks up new tech stacks within days, not months.',
        'Meticulous attention to UX — every pixel and interaction is intentional.',
      ])
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="py-20 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto"
    >
      <div className="text-center mb-10">
        <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">AI Generated</span>
        <h2 className="text-4xl md:text-5xl font-bold mt-2">
          Why Hire{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Me?</span>
        </h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm">
          Let AI make the case. Click below to generate a compelling pitch based on my actual portfolio data.
        </p>
      </div>

      {!generated ? (
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-600/25 disabled:opacity-60 transition-opacity"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating pitch...</> : <><Sparkles className="w-5 h-5" /> Generate My Pitch</>}
          </motion.button>
        </div>
      ) : (
        <div className="space-y-4">
          {points.map((point, i) => {
            const Icon = ICONS[i % ICONS.length]
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="flex items-start gap-4 p-5 bg-secondary border border-border rounded-2xl hover:border-blue-600/30 transition-all"
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex-shrink-0 shadow-md">
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm md:text-base leading-relaxed pt-0.5">{point}</p>
              </motion.div>
            )
          })}
          <div className="flex justify-center pt-4">
            <button onClick={() => { setGenerated(false); setPoints([]); generate() }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-4 h-4" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </motion.section>
  )
}
