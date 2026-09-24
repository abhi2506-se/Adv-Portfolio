'use client'

/**
 * MaintenanceGuard
 * ─────────────────────────────────────────────────────────────────────────────
 * Polls /api/maintenance every 4 s.
 *
 * VISITOR — maintenance ON:
 *  • Full-screen dark overlay at z-[99999].
 *    Chatbot is z-[9999] — overlay is 10× higher, completely hidden.
 *  • body.overflow = 'hidden' prevents background scroll.
 *    We do NOT touch body.pointerEvents (known browser-compat issue).
 *    The fixed overlay covers all content natively via z-index.
 *  • Admin's custom message revealed character-by-character (typewriter).
 *  • Staggered entrance: icon → eyebrow → heading → message → status card.
 *  • Floating colour orbs, dot-grid, slow scan-line sweep, vignette.
 *
 * VISITOR — maintenance OFF:
 *  • AnimatePresence drives a 0.35 s fade-out — site appears with NO refresh.
 *  • body.overflow restored immediately.
 *
 * ADMIN (portfolio_admin_session cookie present):
 *  • Slim amber top-banner only — site fully usable.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Construction, RefreshCw, Wifi, WifiOff, Clock, AlertTriangle,
} from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────
const POLL_MS         = 4_000
const ADMIN_COOKIE    = 'portfolio_admin_session'
const DEFAULT_MESSAGE = "We're currently upgrading things to serve you better. We'll be back shortly! 🚀"
const TYPE_MS         = 26    // ms per character

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAdminSession(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${ADMIN_COOKIE}=`))
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, msPerChar: number, run: boolean): string {
  const [shown, setShown] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (!run || !text) { setShown(''); return }

    setShown('')
    let i = 0
    const tick = () => {
      i++
      setShown(text.slice(0, i))
      if (i < text.length) timer.current = setTimeout(tick, msPerChar)
    }
    timer.current = setTimeout(tick, 420)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [text, run]) // eslint-disable-line react-hooks/exhaustive-deps

  return shown
}

// ─── Background decoration ────────────────────────────────────────────────────
function FloatingOrbs() {
  const orbs = [
    { w: 520, h: 520, l: '-6%', t: '3%',  c: 'rgba(37,99,235,0.10)',  d: 9  },
    { w: 400, h: 400, l: '60%', t: '54%', c: 'rgba(6,182,212,0.08)',  d: 13 },
    { w: 320, h: 320, l: '26%', t: '-7%', c: 'rgba(99,102,241,0.07)', d: 16 },
    { w: 280, h: 280, l: '76%', t: '10%', c: 'rgba(37,99,235,0.05)',  d: 11 },
    { w: 220, h: 220, l: '8%',  t: '70%', c: 'rgba(6,182,212,0.05)',  d: 8  },
  ]
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {orbs.map((o, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width: o.w, height: o.h, left: o.l, top: o.t, background: o.c, filter: 'blur(80px)' }}
          animate={{ scale:[1,1.18,0.94,1.1,1], opacity:[0.5,1,0.55,0.9,0.5], x:[0,18,-12,14,0], y:[0,-14,9,-6,0] }}
          transition={{ duration: o.d, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
    </div>
  )
}

function DotGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.55,
      }} />
  )
}

function ScanLine() {
  return (
    <motion.div className="absolute left-0 right-0 h-[2px] pointer-events-none" aria-hidden
      style={{ background: 'linear-gradient(90deg,transparent,rgba(59,130,246,0.22),transparent)', filter: 'blur(1px)' }}
      initial={{ top: 0 }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }} />
  )
}

function Vignette() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden
      style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.72) 100%)' }} />
  )
}

function BounceDots() {
  return (
    <span className="inline-flex items-end gap-[3px] ml-1 mb-0.5">
      {[0,1,2].map(i => (
        <span key={i} className="w-[3px] h-[3px] rounded-full bg-white/35 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.85s' }} />
      ))}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
// Inner guard — only rendered on non-admin pages
function MaintenanceGuardInner() {
  const [active,         setActive]         = useState(false)
  const [message,        setMessage]        = useState(DEFAULT_MESSAGE)
  const [isAdmin,        setIsAdmin]        = useState(false)
  const [lastChecked,    setLastChecked]    = useState<Date | null>(null)
  const [online,         setOnline]         = useState(true)
  const [adminDismissed, setAdminDismissed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Typewriter only runs when overlay is visible (non-admin)
  const typedText = useTypewriter(message, TYPE_MS, active && !isAdmin)

  useEffect(() => { setIsAdmin(isAdminSession()) }, [])

  useEffect(() => {
    setOnline(navigator.onLine)
    const up = () => setOnline(true); const dn = () => setOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', dn)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn) }
  }, [])

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setActive(Boolean(data.active))
      if (typeof data.message === 'string' && data.message.trim()) {
        setMessage(data.message.trim())
      }
      setLastChecked(new Date())
    } catch { /* keep current state on network failure */ }
  }, [])

  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  useEffect(() => { if (!active) setAdminDismissed(false) }, [active])

  // Scroll lock — lock body AND any scrolling elements to freeze page in place
  useEffect(() => {
    if (active && !isAdmin) {
      // Save current scroll position
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      // Restore scroll position
      const top = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (top) {
        window.scrollTo(0, -parseInt(top || '0'))
      }
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [active, isAdmin])

  // ── Admin thin banner ────────────────────────────────────────────────────
  if (isAdmin && active && !adminDismissed) {
    return (
      <motion.div
        initial={{ y: -52, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -52, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="fixed top-0 inset-x-0 z-[9998] flex items-center justify-between gap-3
                   px-4 py-2.5 bg-amber-500 text-black text-sm font-semibold shadow-xl"
      >
        <span className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            Maintenance mode is <strong>ON</strong> — visitors see a full-screen block page. You can still edit normally.
          </span>
        </span>
        <button onClick={() => setAdminDismissed(true)}
          className="flex-shrink-0 px-2.5 py-0.5 rounded text-black/60 hover:text-black hover:bg-black/10 transition-colors text-xs whitespace-nowrap">
          Dismiss
        </button>
      </motion.div>
    )
  }

  // ── Full-screen visitor overlay ──────────────────────────────────────────
  //
  // z-[99999] > chatbot z-[9999] > chatbot-panel z-[9998] > everything else
  //
  // We do NOT set pointer-events on body because:
  //   (a) `pointerEvents: 'all'` is SVG-only — invalid on HTML, silently ignored
  //   (b) body pointer-events:none can block the overlay's own events in
  //       certain browser/OS combinations
  //
  // The fixed overlay with a positive z-index already intercepts all pointer
  // events from elements below it — no extra CSS needed.
  return (
    <AnimatePresence mode="wait">
      {active && !isAdmin && (
        <motion.div
          key="maintenance-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] bg-[#020b18] text-white
                     flex items-center justify-center overflow-hidden"
          style={{ width: '100vw', height: '100dvh' }}
          aria-modal="true"
          role="alertdialog"
          aria-label="Site under maintenance"
        >
          <FloatingOrbs />
          <DotGrid />
          <ScanLine />
          <Vignette />

          {/* ── Content ── */}
          <div className="relative z-10 w-full max-w-[520px] mx-auto px-6
                          flex flex-col items-center gap-8 text-center">

            {/* 1 — Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -40, opacity: 0 }}
              animate={{ scale: 1, rotate: 0,   opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.04 }}
            >
              <motion.div
                animate={{ rotate: [0,-13,13,-8,8,-3,3,0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4.5, ease: 'easeInOut' }}
                className="relative"
              >
                {/* Pulsing glow ring */}
                <motion.div className="absolute inset-0 rounded-[30px]"
                  animate={{ boxShadow: [
                    '0 0  0px  0px rgba(59,130,246,0.0)',
                    '0 0 44px 18px rgba(59,130,246,0.18)',
                    '0 0  0px  0px rgba(59,130,246,0.0)',
                  ]}}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
                <div className="w-24 h-24 rounded-[30px]
                                bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400
                                flex items-center justify-center
                                shadow-[0_24px_60px_rgba(37,99,235,0.45)]
                                ring-1 ring-white/10">
                  <Construction className="w-11 h-11 text-white drop-shadow" />
                </div>
              </motion.div>
            </motion.div>

            {/* 2 — Eyebrow + Heading */}
            <motion.div className="space-y-3"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
              <motion.p
                className="text-[11px] font-bold tracking-[0.28em] uppercase text-blue-400/70"
                initial={{ opacity: 0, letterSpacing: '0.45em' }}
                animate={{ opacity: 1, letterSpacing: '0.28em' }}
                transition={{ delay: 0.26, duration: 0.7 }}>
                Site temporarily unavailable
              </motion.p>
              <h1 className="text-[clamp(2.4rem,8vw,3.8rem)] font-black tracking-tight leading-[1.05]">
                Under{' '}
                <span className="text-transparent bg-clip-text
                                 bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500">
                  Maintenance
                </span>
              </h1>
            </motion.div>

            {/* 3 — Admin's typed message */}
            <motion.div className="min-h-[3.5rem] flex items-center justify-center w-full"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.6 }}>
              <p className="text-white/70 text-[1.1rem] leading-relaxed font-light max-w-[420px]">
                {typedText}
                {/* Blinking cursor while still typing */}
                {typedText.length < message.length && (
                  <motion.span
                    className="inline-block w-[2px] h-[1.1em] bg-blue-400 align-middle ml-[2px] rounded-sm"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.48, repeat: Infinity }} />
                )}
              </p>
            </motion.div>

            {/* 4 — Status card */}
            <motion.div
              className="w-full max-w-[360px] rounded-2xl border border-white/[0.07]
                         bg-white/[0.03] backdrop-blur-sm px-5 py-4 space-y-3 text-sm"
              initial={{ opacity: 0, y: 26, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              transition={{ delay: 0.5, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-white/35">Status</span>
                <span className="flex items-center gap-2 font-semibold text-amber-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/70 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                  In progress
                </span>
              </div>
              {/* Connection */}
              <div className="flex items-center justify-between">
                <span className="text-white/35">Your connection</span>
                <span className={`flex items-center gap-1.5 font-semibold ${online ? 'text-emerald-400' : 'text-red-400'}`}>
                  {online ? <><Wifi className="w-3.5 h-3.5"/>Online</> : <><WifiOff className="w-3.5 h-3.5"/>Offline</>}
                </span>
              </div>
              {/* Auto-check */}
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-white/28 text-xs flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }}/>
                  Checking every {POLL_MS / 1000} s
                </span>
                <span className="text-white/24 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3"/>
                  {lastChecked
                    ? lastChecked.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })
                    : 'Connecting…'}
                  <BounceDots />
                </span>
              </div>
            </motion.div>

            {/* 5 — Footer note */}
            <motion.p className="text-[11px] text-white/20 max-w-[320px] leading-relaxed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.78 }}>
              This screen disappears automatically when the site comes back online — no refresh needed.
            </motion.p>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Public export — skips entirely on /admin/* routes ───────────────────────
export function MaintenanceGuard() {
  const pathname = usePathname()
  // Hard-skip on ALL admin routes — admin panel is never affected by maintenance
  if (pathname?.startsWith("/admin")) return null
  return <MaintenanceGuardInner />
}
