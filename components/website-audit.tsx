'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Search, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AuditCheck = { label: string; passed: boolean; weight: number }
type AuditResult = {
  url: string
  score: number
  loadMs: number
  sizeKb: number
  checks: AuditCheck[]
  suggestions: string[]
  growthSuggestions: string[]
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
  if (score >= 50) return 'text-amber-500 border-amber-500/30 bg-amber-500/10'
  return 'text-red-500 border-red-500/30 bg-red-500/10'
}

export function WebsiteAudit() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AuditResult | null>(null)

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Audit failed')
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 md:py-20">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Free Website Audit
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Want to build software, or see how your site scores?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Paste your website's link below for an instant score and concrete suggestions —
          or connect to discuss building something new, more interactive, and built to convert visitors into customers.
        </p>
      </div>

      <form onSubmit={handleAudit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourwebsite.com"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <Button type="submit" disabled={loading} className="whitespace-nowrap">
          {loading ? 'Analyzing…' : 'Audit my website'}
        </Button>
      </form>

      {error && <p className="text-center text-sm text-red-500 mb-6">{error}</p>}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="border border-border rounded-2xl p-6 md:p-8 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Score for</p>
              <p className="font-medium truncate max-w-[280px]">{result.url}</p>
            </div>
            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold ${scoreColor(result.score)}`}>
              {result.score}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {result.checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                {c.passed
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                <span className={c.passed ? '' : 'text-muted-foreground'}>{c.label}</span>
              </div>
            ))}
          </div>

          {result.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">What to fix first</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 p-5">
            <p className="text-sm font-semibold mb-2">Want it more interactive and built to convert?</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside mb-4">
              {result.growthSuggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <Button asChild>
              <Link href="/portal/login" className="inline-flex items-center gap-1.5">
                Connect <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You'll land in the client portal, where you can sign up or sign in and start a project.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
