'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { isWhitelistedName } from '@/lib/security-whitelist'

// ─── Suspicious Activity Detector ─────────────────────────────────────────────
// Detects abusive language, screenshot attempts, source-code inspection,
// rapid interactions, and other suspicious patterns.
// Reports to /api/security/report which auto-blocks with duration.

let lastReportTime: Record<string, number> = {}
const COOLDOWN_MS = 15_000

// ─── Browser Fingerprint (stable across IP changes) ───────────────────────────
let _cachedFingerprint: string | null = null

async function getFingerprint(): Promise<string> {
  if (_cachedFingerprint) return _cachedFingerprint
  try {
    const stored = localStorage.getItem('__fp_id')
    if (stored && stored.length > 10) { _cachedFingerprint = stored; return stored }
  } catch {}
  try {
    const parts: string[] = []
    parts.push(navigator.userAgent)
    parts.push(String(screen.width) + 'x' + String(screen.height) + 'x' + String(screen.colorDepth))
    parts.push(navigator.language || '')
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '')
    parts.push(String(navigator.hardwareConcurrency || 0))
    parts.push(String((navigator as any).deviceMemory || 0))
    // Canvas fingerprint
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'; ctx.font = '14px Arial'
        ctx.fillStyle = '#f60'; ctx.fillRect(125, 1, 62, 20)
        ctx.fillStyle = '#069'; ctx.fillText('Fingerprint🔒', 2, 15)
        ctx.fillStyle = 'rgba(102,204,0,0.7)'; ctx.fillText('Fingerprint🔒', 4, 17)
        parts.push(canvas.toDataURL().slice(-50))
      }
    } catch {}
    // Audio fingerprint
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const ctx = new AudioContext()
        const oscillator = ctx.createOscillator()
        const analyser = ctx.createAnalyser()
        const gain = ctx.createGain()
        gain.gain.value = 0
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(10000, ctx.currentTime)
        oscillator.connect(analyser); analyser.connect(gain); gain.connect(ctx.destination)
        oscillator.start(0)
        const data = new Float32Array(analyser.frequencyBinCount)
        analyser.getFloatFrequencyData(data)
        oscillator.stop()
        ctx.close()
        parts.push(String(data.slice(0, 5).join(',')))
      }
    } catch {}
    const raw = parts.join('|')
    // Hash it
    const encoder = new TextEncoder()
    const data2 = encoder.encode(raw)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data2)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
    _cachedFingerprint = fp
    try { localStorage.setItem('__fp_id', fp) } catch {}
    return fp
  } catch {
    const fallback = Math.random().toString(36).slice(2) + Date.now().toString(36)
    _cachedFingerprint = fallback
    return fallback
  }
}

// Silently fetch approximate location from IP — no browser permission needed
async function fetchIPLocation(): Promise<string> {
  try {
    const res = await fetch('https://ip-api.com/json/?fields=city,regionName,country,lat,lon,status', {
      signal: AbortSignal.timeout(3000),
    })
    const d = await res.json()
    if (d.status === 'success') {
      const parts = [d.city, d.regionName, d.country].filter(Boolean)
      return parts.join(', ')
    }
  } catch {}
  return ''
}

// Read the current visitor's display name from whichever local profile is
// available (guest visitor profile, or a logged-in user session).
function getStoredVisitorName(): string {
  try {
    const visitor = localStorage.getItem('portfolio_visitor_profile')
    if (visitor) {
      const p = JSON.parse(visitor)
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
      if (name) return name
    }
  } catch {}
  try {
    const session = localStorage.getItem('portfolio_user_session_v1')
    if (session) {
      const u = JSON.parse(session)
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ')
      if (name) return name
    }
  } catch {}
  return ''
}

/** True if the currently identified visitor is on the security whitelist. */
function isCurrentVisitorWhitelisted(): boolean {
  return isWhitelistedName(getStoredVisitorName())
}

async function reportActivity(type: string, details: string): Promise<{ blocked: boolean; blockHours: number; unblockAt: number }> {
  // Whitelisted visitors are fully exempt — nothing is reported or blocked.
  if (isCurrentVisitorWhitelisted()) {
    return { blocked: false, blockHours: 0, unblockAt: 0 }
  }
  const now = Date.now()
  if (lastReportTime[type] && now - lastReportTime[type] < COOLDOWN_MS) {
    return { blocked: false, blockHours: 0, unblockAt: 0 }
  }
  lastReportTime[type] = now
  try {
    const [location, fingerprint] = await Promise.all([fetchIPLocation(), getFingerprint()])
    // Try to get stored user info if they've registered
    let user_name = ''; let user_email = ''
    try {
      const stored = localStorage.getItem('portfolio_visitor_profile')
      if (stored) {
        const p = JSON.parse(stored)
        user_name = [p.first_name, p.last_name].filter(Boolean).join(' ')
        user_email = p.email || ''
      }
    } catch {}
    const res = await fetch('/api/security/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, details, location, fingerprint, user_name, user_email }),
    })
    if (res.ok) {
      const data = await res.json()
      return { blocked: data.blocked || false, blockHours: data.blockHours || 0, unblockAt: data.unblockAt || 0 }
    }
  } catch {}
  return { blocked: false, blockHours: 0, unblockAt: 0 }
}

// ─── Abuse Patterns ───────────────────────────────────────────────────────────
const ENGLISH_ABUSE = [
  /\bf+u+c+k+\b/i, /\bs+h+i+t+\b/i, /bastard/i, /\bbitch\b/i, /asshole/i,
  /\bidiot\b/i, /\bmoron\b/i, /hate\s+you/i, /kill\s+you/i, /\bcunt\b/i,
  /\bwhore\b/i, /\bretard\b/i, /\bfaggot\b/i, /\bslut\b/i, /\bnigger\b/i,
  /\bbastard\b/i, /\bdumbass\b/i, /\barse\b/i, /\bdick\b/i, /piece\s+of\s+shit/i,
  /\bstupid\s+(ass|bitch|idiot)\b/i, /go\s+to\s+hell/i, /\bscumbag\b/i,
]

const HINDI_ABUSE = [
  /गांडू/i, /चुतिया/i, /मादरचोद/i, /बेहेनचोद/i, /रंडी/i, /हरामी/i,
  /कमीना/i, /भड़वा/i, /सूअर/i, /कुत्ता/i, /कुत्ते/i, /हरामज़ादा/i,
  /लौड़ा/i, /लंड/i, /भोसड़ी/i, /साली/i, /साले/i, /बकलोल/i,
  /झाटू/i, /छिनाल/i, /चोद/i, /गांड/i,
]

const HINDI_ROMAN_ABUSE = [
  /\bgaandu\b/i, /\bchutiya\b/i, /\bmadarchod\b/i, /\bbehenchod\b/i,
  /\brandi\b/i, /\bharami\b/i, /\bkamina\b/i, /\bbhadwa\b/i, /\bharamzada\b/i,
  /\blawda\b/i, /\bland\b/i, /\bchod\b/i, /\bsaala\b/i, /\bsaali\b/i,
  /\bmc\b/i, /\bbc\b/i, /\bbkl\b/i, /\bbhosdike\b/i,
  // New additions requested
  /\bbsdk\b/i, /\blodu\b/i, /\bloda\b/i, /\blode\b/i, /\blund\b/i,
  /\bchus\b/i, /\bchut\b/i, /\bbhn\s*k\s*lode?\b/i, /\bbhn\s*ke\s*lode?\b/i,
  /\bmadarchod\b/i, /\bmadarc(?:hod|hood)\b/i, /\bbc\b/i,
  /\bbhai\s*ki\s*aankh\b/i, /\bbhenchod\b/i, /\bbhen\s*c\b/i,
  /\bkaminey\b/i, /\bkutiya\b/i, /\bharam\s*zada\b/i, /\bbakait\b/i,
  /\bkutia\b/i, /\bsala\b/i, /\bsali\b/i, /\bbosdk\b/i,
]

const PUNJABI_ABUSE = [
  /ਮਾਦਰਚੋਦ/i, /ਭੈਣਚੋਦ/i, /ਕੁੱਤਾ/i, /\bpendu\b/i, /\bdallay\b/i,
]

const BENGALI_ABUSE = [
  /মাদারচোদ/i, /শালা/i, /কুত্তা/i, /হারামি/i, /\bshala\b/i,
]

const TAMIL_ABUSE = [
  /ஓட்டா/i, /கழுதை/i, /நாயே/i, /\bnaaye\b/i, /\bottha\b/i, /\bpunda\b/i,
]

const TELUGU_ABUSE = [
  /నీ అమ్మ/i, /పుండాకాయ/i, /\bdengudu\b/i, /\bpukku\b/i,
]

const KANNADA_ABUSE = [
  /ಸೂಳೆ/i, /ನಾಯಿ/i, /\bsule\b/i, /\bnayi\b/i, /\bmaga\b/i,
]

const MARATHI_ABUSE = [
  /मादरचोद/i, /भोसड्या/i, /झवाड्या/i, /\bghanta\b/i, /\blandya\b/i,
]

const URDU_ABUSE = [
  /کتا/i, /حرامی/i, /\bkutta\b/i, /\bharami\b/i, /\bbewakoof\b/i,
]

// Illegal/harmful intent patterns
const ILLEGAL_PATTERNS = [
  /how\s+to\s+(hack|crack|exploit|bypass|steal)/i,
  /find\s+(source\s+code|admin\s+password|database)/i,
  /sql\s+injection/i,
  /xss\s+attack/i,
  /\bddos\b/i,
  /\bmalware\b/i,
  /i\s+will\s+(hack|destroy|ddos|attack)\s+(this|your)\s+(site|website|server)/i,
  /how\s+to\s+bypass\s+(security|login|auth)/i,
  /looking\s+for\s+(exploit|vulnerability|vuln)\b/i,
]

const ALL_ABUSE_PATTERNS = [
  ...ENGLISH_ABUSE, ...HINDI_ABUSE, ...HINDI_ROMAN_ABUSE,
  ...PUNJABI_ABUSE, ...BENGALI_ABUSE, ...TAMIL_ABUSE,
  ...TELUGU_ABUSE, ...KANNADA_ABUSE, ...MARATHI_ABUSE, ...URDU_ABUSE,
]

export function containsAbuse(text: string): boolean | string {
  for (const p of ALL_ABUSE_PATTERNS) {
    const m = text.match(p)
    if (m) return m[0] // return the matched word for detailed logging
  }
  return false
}

export function containsIllegalIntent(text: string): boolean {
  return ILLEGAL_PATTERNS.some(p => p.test(text))
}

// ─── Blocked Screen Component ─────────────────────────────────────────────────
function BlockedScreen({ blockHours, unblockAt, onUnblocked }: { blockHours: number; unblockAt: number; onUnblocked: () => void }) {
  const isPermanent = unblockAt === 0
  const [timeLeft, setTimeLeft] = useState('')
  const [expired, setExpired] = useState(false)
  const [showAppeal, setShowAppeal] = useState(false)
  const [appealName, setAppealName] = useState('')
  const [appealEmail, setAppealEmail] = useState('')
  const [appealComment, setAppealComment] = useState('')
  const [appealSent, setAppealSent] = useState(false)
  const [appealLoading, setAppealLoading] = useState(false)
  const [appealError, setAppealError] = useState('')

  // ── Self-unblock via relation to the site owner ──────────────────────────
  const [showRelation, setShowRelation] = useState(false)
  const [relation, setRelation] = useState<string | null>(null)
  const [relationName, setRelationName] = useState('')
  const [relationChecking, setRelationChecking] = useState(false)
  const [relationError, setRelationError] = useState('')

  const RELATIONS = [
    { id: 'wife', label: "I'm his wife" },
    { id: 'family', label: "I'm family" },
    { id: 'friend', label: "I'm a friend" },
    { id: 'other', label: 'Other' },
  ]

  const handleRelationSubmit = async () => {
    if (!relationName.trim()) { setRelationError('Please enter the name.'); return }
    setRelationChecking(true); setRelationError('')
    try {
      const fp = await getFingerprint().catch(() => '')
      const res = await fetch('/api/security/self-unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relation, name: relationName.trim(), fingerprint: fp }),
      })
      const data = await res.json()
      if (data.unblocked) {
        onUnblocked()
      } else {
        setRelationError(data.error || 'That name does not match our records.')
      }
    } catch {
      setRelationError('Network error. Please try again.')
    }
    setRelationChecking(false)
  }

  useEffect(() => {
    if (isPermanent) { setTimeLeft('Permanent'); return }
    const tick = () => {
      const remaining = unblockAt - Date.now()
      if (remaining <= 0) { setExpired(true); setTimeLeft('00h 00m 00s'); return }
      const h = Math.floor(remaining / 3600000)
      const m = Math.floor((remaining % 3600000) / 60000)
      const s = Math.floor((remaining % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [unblockAt, isPermanent])

  const handleAppealSubmit = async () => {
    if (!appealComment.trim()) { setAppealError('Please describe why you think this is an error.'); return }
    setAppealLoading(true); setAppealError('')
    try {
      const fp = await getFingerprint().catch(() => '')
      const res = await fetch('/api/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: appealName, user_email: appealEmail, comment: appealComment, fingerprint: fp }),
      })
      if (res.ok) { setAppealSent(true) }
      else { setAppealError('Failed to send appeal. Please try again.') }
    } catch { setAppealError('Network error. Please try again.') }
    setAppealLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-y-auto">
      <div className="text-center max-w-sm mx-auto px-6 py-8 w-full">
        <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-2xl font-bold text-red-400 mb-3">Access Blocked</h1>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          Suspicious activity was detected on your session. Access has been{' '}
          {isPermanent
            ? <><strong className="text-red-300">permanently suspended</strong>.</>
            : <>suspended for <strong className="text-red-300">{blockHours} hour{blockHours !== 1 ? 's' : ''}</strong>.</>
          }
        </p>
        <div className="bg-slate-900 border border-red-500/20 rounded-2xl px-5 py-4 mb-4">
          <p className="text-xs text-slate-400 mb-1">{isPermanent ? 'Status' : expired ? 'Block expired' : 'Time remaining'}</p>
          <p className={`text-xl font-mono font-bold ${isPermanent ? 'text-red-500' : 'text-red-400'}`}>{isPermanent ? '🚫 Permanent' : (timeLeft || '…')}</p>
        </div>
        {!isPermanent && expired ? (
          <button onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-all mb-3">
            ✅ Refresh to Continue
          </button>
        ) : null}

        {/* Self-unblock via relation to the site owner */}
        {!showRelation && !showAppeal && !appealSent && (
          <button onClick={() => setShowRelation(true)}
            className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold text-sm transition-all mb-3">
            🙋 I know the site owner personally
          </button>
        )}

        {showRelation && (
          <div className="mb-4 bg-slate-900/80 border border-blue-500/20 rounded-2xl p-4 text-left space-y-3">
            <h3 className="text-sm font-bold text-blue-300 text-center">What's your relation to Abhishek?</h3>
            {!relation ? (
              <div className="grid grid-cols-2 gap-2">
                {RELATIONS.map(r => (
                  <button key={r.id} onClick={() => setRelation(r.id)}
                    className="py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:border-blue-500/50 hover:text-white transition-all">
                    {r.label}
                  </button>
                ))}
              </div>
            ) : relation === 'wife' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Enter your full name</label>
                  <input value={relationName} onChange={e => { setRelationName(e.target.value); setRelationError('') }}
                    placeholder="Your name"
                    onKeyDown={e => { if (e.key === 'Enter') handleRelationSubmit() }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
                </div>
                {relationError && <p className="text-red-400 text-xs">{relationError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleRelationSubmit} disabled={relationChecking}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all disabled:opacity-50">
                    {relationChecking ? 'Checking…' : '✅ Verify & Unblock'}
                  </button>
                  <button onClick={() => { setRelation(null); setRelationName(''); setRelationError('') }}
                    className="px-3 py-2 rounded-xl bg-slate-700 text-slate-400 text-xs hover:text-white transition-all">
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-400 text-xs text-center">
                  This doesn't automatically unblock you — please submit an appeal below instead and Abhishek will review it.
                </p>
                <button onClick={() => { setRelation(null); setShowRelation(false); setShowAppeal(true) }}
                  className="w-full py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all">
                  📨 Go to Appeal
                </button>
                <button onClick={() => setRelation(null)}
                  className="w-full py-2 rounded-xl bg-slate-700 text-slate-400 text-xs hover:text-white transition-all">
                  Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Appeal section */}
        {!showAppeal && !appealSent && (
          <div className="mt-4 text-left">
            <p className="text-slate-500 text-xs mb-3 text-center">
              {isPermanent
                ? 'This block is permanent. Submit an appeal if you believe this is an error.'
                : 'You will be automatically unblocked after this period.'}
            </p>
            <button onClick={() => setShowAppeal(true)}
              className="w-full py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-semibold text-sm transition-all">
              📨 Appeal this blocking decision
            </button>
            <p className="text-slate-600 text-[11px] text-center mt-2">If you believe this is an error</p>
          </div>
        )}

        {showAppeal && !appealSent && (
          <div className="mt-4 bg-slate-900/80 border border-violet-500/20 rounded-2xl p-4 text-left space-y-3">
            <h3 className="text-sm font-bold text-violet-300 text-center">Appeal Blocking Decision</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Your Name</label>
              <input value={appealName} onChange={e => setAppealName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Your Email</label>
              <input value={appealEmail} onChange={e => setAppealEmail(e.target.value)}
                placeholder="your@email.com" type="email"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Reason for Appeal <span className="text-red-400">*</span></label>
              <textarea value={appealComment} onChange={e => setAppealComment(e.target.value)}
                placeholder="Explain why you believe this block is an error..."
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none" />
            </div>
            {appealError && <p className="text-red-400 text-xs">{appealError}</p>}
            <div className="flex gap-2">
              <button onClick={handleAppealSubmit} disabled={appealLoading}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all disabled:opacity-50">
                {appealLoading ? 'Sending…' : '📨 Send Appeal'}
              </button>
              <button onClick={() => setShowAppeal(false)}
                className="px-3 py-2 rounded-xl bg-slate-700 text-slate-400 text-xs hover:text-white transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {appealSent && (
          <div className="mt-4 bg-green-900/20 border border-green-500/20 rounded-2xl p-4">
            <p className="text-green-400 text-sm font-semibold mb-1">✅ Appeal Submitted</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Your appeal has been received. Please wait up to 24 hours —{' '}
              <strong className="text-slate-300">Abhishek Singh</strong> will review and revert back if this is an error.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Detector Component ──────────────────────────────────────────────────
export function SuspiciousActivityDetector() {
  const screenshotAttemptRef = useRef(0)
  const viewSourceAttemptRef = useRef(0)
  const typingAbuseBufferRef = useRef<string[]>([])
  const [blocked, setBlocked] = useState(false)
  const [blockHours, setBlockHours] = useState(0)
  const [unblockAt, setUnblockAt] = useState(0)
  // Never show block screen on admin routes
  const [isAdminRoute, setIsAdminRoute] = useState(false)

  useEffect(() => {
    // Check once on mount and whenever pathname changes
    const checkAdmin = () => setIsAdminRoute(window.location.pathname.startsWith('/admin'))
    checkAdmin()
    window.addEventListener('popstate', checkAdmin)
    return () => window.removeEventListener('popstate', checkAdmin)
  }, [])

  const handleBlock = useCallback((hours: number, expiry: number) => {
    if (hours > 0 && expiry > 0) {
      setBlockHours(hours); setUnblockAt(expiry); setBlocked(true)
      try {
        localStorage.setItem('__block_until', String(expiry))
        localStorage.setItem('__block_hours', String(hours))
      } catch {}
    }
  }, [])

  const handleUnblock = useCallback(() => {
    setBlocked(false); setBlockHours(0); setUnblockAt(0)
    try { localStorage.removeItem('__block_until'); localStorage.removeItem('__block_hours') } catch {}
  }, [])

  // ── On mount: check localStorage + server ──────────────────────────────────
  useEffect(() => {
    const checkBlockStatus = async () => {
      // Whitelisted visitors are never blocked — clear any stale local block state.
      if (isCurrentVisitorWhitelisted()) { handleUnblock(); return }
      try {
        const until = parseInt(localStorage.getItem('__block_until') || '0')
        const hours = parseInt(localStorage.getItem('__block_hours') || '0')
        if (until > Date.now() && hours > 0) {
          setUnblockAt(until); setBlockHours(hours); setBlocked(true)
        } else if (until > 0) {
          localStorage.removeItem('__block_until'); localStorage.removeItem('__block_hours')
        }
      } catch {}
      try {
        const fp = await getFingerprint().catch(() => '')
        const name = getStoredVisitorName()
        const res = await fetch(`/api/security/report?fp=${encodeURIComponent(fp)}&name=${encodeURIComponent(name)}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.blocked && data.unblockAt > 0) handleBlock(data.blockHours || 1, data.unblockAt)
          else if (!data.blocked) handleUnblock()
        }
      } catch {}
    }
    checkBlockStatus()
  }, [handleBlock, handleUnblock])

  // ── Poll server every 5s — fast enough to enforce manual admin blocks near-instantly ──
  useEffect(() => {
    const poll = setInterval(async () => {
      // Whitelisted visitors are never blocked — clear any stale local block state.
      if (isCurrentVisitorWhitelisted()) { if (blocked) handleUnblock(); return }
      try {
        const fp = await getFingerprint().catch(() => '')
        const name = getStoredVisitorName()
        const res = await fetch(`/api/security/report?fp=${encodeURIComponent(fp)}&name=${encodeURIComponent(name)}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data.blocked && data.unblockAt > 0 && !blocked) handleBlock(data.blockHours || 1, data.unblockAt)
        else if (data.blocked && data.unblockAt === 0 && !blocked) handleBlock(9999, 0) // permanent
        else if (!data.blocked && blocked) handleUnblock()
      } catch {}
    }, 5_000)
    return () => clearInterval(poll)
  }, [blocked, handleBlock, handleUnblock])

  // 1. DevTools / View Source detection
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isDevTools =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'U')
      if (isDevTools) {
        e.preventDefault()
        viewSourceAttemptRef.current++
        if (viewSourceAttemptRef.current >= 2) {
          const result = await reportActivity('VIEW_SOURCE_ATTEMPT', `DevTools/ViewSource attempt. Key: ${e.key}. Count: ${viewSourceAttemptRef.current}`)
          if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
        } else {
          // First attempt — warn but still log
          await reportActivity('VIEW_SOURCE_ATTEMPT', `First DevTools attempt. Key: ${e.key}`)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBlock])

  // 2. Right-click on protected content
  useEffect(() => {
    const handleContextMenu = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isProtected = target.closest('[data-protected]') ||
        target.tagName === 'IMG' || target.tagName === 'VIDEO' ||
        target.closest('.certificate-viewer') || target.closest('.blog-lightbox')
      if (isProtected) {
        const result = await reportActivity('RIGHT_CLICK_PROTECTED', `Right-click on ${target.tagName} at ${target.className?.slice(0, 80)}`)
        if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
      }
    }
    window.addEventListener('contextmenu', handleContextMenu)
    return () => window.removeEventListener('contextmenu', handleContextMenu)
  }, [handleBlock])

  // 3. Desktop screenshot — PrintScreen key
  useEffect(() => {
    const handleKeyUp = async (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        screenshotAttemptRef.current++
        const result = await reportActivity('SCREENSHOT_ATTEMPT', `PrintScreen pressed. Attempt #${screenshotAttemptRef.current}. Page: ${window.location.pathname}`)
        if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
      }
    }
    window.addEventListener('keyup', handleKeyUp)
    return () => window.removeEventListener('keyup', handleKeyUp)
  }, [handleBlock])

  // 4. Mobile screenshot — visibilitychange heuristic
  useEffect(() => {
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    if (!isMobile) return
    let lastHidden = 0
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') { lastHidden = Date.now() }
      else if (document.visibilityState === 'visible' && lastHidden > 0) {
        const hiddenDuration = Date.now() - lastHidden
        lastHidden = 0
        if (hiddenDuration >= 50 && hiddenDuration < 600) {
          const result = await reportActivity('SCREENSHOT_MOBILE', `Mobile screenshot detected. Hide duration: ${hiddenDuration}ms. Page: ${window.location.pathname}`)
          if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [handleBlock])

  // 5. Abusive language detection in ALL text inputs and textareas
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>

    const handleInput = async (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement
      if (!target || !('value' in target)) return
      const text = target.value

      // Push to rolling buffer and check
      typingAbuseBufferRef.current = [...typingAbuseBufferRef.current.slice(-9), text]
      const fullText = typingAbuseBufferRef.current.join(' ')

      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(async () => {
        if (containsAbuse(text)) {
          const matched = containsAbuse(text)
          const result = await reportActivity('ABUSIVE_LANGUAGE_TYPED', `Abusive language typed in input field. Matched: "${matched}". Snippet: "${text.slice(0, 120)}"`)
          if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
          return
        }
        if (containsIllegalIntent(fullText)) {
          const result = await reportActivity('ILLEGAL_INTENT_TYPED', `Illegal/harmful intent in typed text: "${text.slice(0, 120)}"`)
          if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
        }
      }, 800)
    }

    document.addEventListener('input', handleInput)
    return () => {
      document.removeEventListener('input', handleInput)
      clearTimeout(debounceTimer)
    }
  }, [handleBlock])

  // 6. Abusive language in chatbot (via custom event)
  useEffect(() => {
    const handleChatMessage = async (e: CustomEvent) => {
      if (!e.detail?.message) return
      const msg = e.detail.message
      if (containsAbuse(msg)) {
        const matched = containsAbuse(msg)
        const result = await reportActivity('ABUSIVE_LANGUAGE_CHATBOT', `Abusive language in chatbot. Matched: "${matched}". Message: "${msg.slice(0, 100)}"`)
        if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
      }
      if (containsIllegalIntent(msg)) {
        const result = await reportActivity('ILLEGAL_INTENT_CHAT', `Illegal/harmful intent in chatbot: "${msg.slice(0, 100)}"`)
        if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
      }
    }
    window.addEventListener('chatbot_message' as any, handleChatMessage)
    return () => window.removeEventListener('chatbot_message' as any, handleChatMessage)
  }, [handleBlock])

  // 7. Rapid click detection (spam/bot behaviour)
  useEffect(() => {
    let clickCount = 0
    let clickWindow = Date.now()
    const handleClick = async () => {
      const now = Date.now()
      if (now - clickWindow > 5000) { clickWindow = now; clickCount = 0 }
      clickCount++
      if (clickCount > 30) {
        const result = await reportActivity('UNUSUAL_RAPID_INTERACTION', `${clickCount} clicks in 5 seconds`)
        if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
        clickCount = 0
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [handleBlock])

  // 8. Drag on protected media
  useEffect(() => {
    const handleDragStart = async (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        e.preventDefault()
        await reportActivity('DRAG_PROTECTED_MEDIA', `Drag on protected ${target.tagName}`)
      }
    }
    document.addEventListener('dragstart', handleDragStart)
    return () => document.removeEventListener('dragstart', handleDragStart)
  }, [])

  // 9. Detect DevTools open via window size difference
  useEffect(() => {
    let devtoolsOpenCount = 0
    const checkDevtools = async () => {
      const widthDiff = window.outerWidth - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight
      // Large diff indicates devtools panel is open
      if (widthDiff > 200 || heightDiff > 200) {
        devtoolsOpenCount++
        if (devtoolsOpenCount === 3) { // only report after sustained open (3 checks = ~9s)
          const result = await reportActivity('DEVTOOLS_OPEN', `DevTools panel detected open. Width diff: ${widthDiff}px, Height diff: ${heightDiff}px`)
          if (result.blocked) handleBlock(result.blockHours, result.unblockAt)
        }
      } else {
        devtoolsOpenCount = 0
      }
    }
    const interval = setInterval(checkDevtools, 3000)
    return () => clearInterval(interval)
  }, [handleBlock])

  // Never block the admin panel — admin must always be accessible.
  // Whitelisted visitors are also never shown the blocked screen.
  if (blocked && !isAdminRoute && !isCurrentVisitorWhitelisted()) {
    return <BlockedScreen blockHours={blockHours} unblockAt={unblockAt} onUnblocked={handleUnblock} />
  }

  return null
}

export { reportActivity }
