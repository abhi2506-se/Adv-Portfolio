'use client'
/**
 * MeetingScheduler — the "Schedule Meeting / Interview" flow.
 * Calendly-style steps, driven by the dynamic availability engine:
 *
 *   1. Duration   — 15 / 30 / 45 / 60 min
 *   2. Date       — calendar, days with any room are highlighted
 *   3. Time slot  — generated on the fly from admin availability windows
 *                   minus existing bookings (+ configurable buffer)
 *   4. Your details — Recruiter/Interview (OTP-verified) or Freelance/Consultation
 *   5. Review & submit — shows start, end, and buffer-until time
 *   6. Confirmation
 *
 * Slots are never pre-created rows — they're computed live by
 * /api/meetings/availability from lib/availability-store.ts, so admin
 * window changes are reflected immediately with zero migration.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Building2, Briefcase, Phone, MessageSquare, CheckCircle2,
  Loader2, Video, ChevronLeft, ChevronRight, Info, ShieldCheck, KeyRound,
  AlertCircle, ArrowLeft, Calendar, Clock, Briefcase as RecruiterIcon, Sparkles,
  Timer, Globe,
} from 'lucide-react'

type MeetingType = 'recruiter' | 'freelance'
type Platform = 'google_meet' | 'zoom' | 'teams'
type Step = 1 | 2 | 3 | 4 | 5 | 6

interface GeneratedSlot { start_time: string; end_time: string; buffer_until: string }

const PLATFORMS: { value: Platform; label: string; icon: string }[] = [
  { value: 'google_meet', label: 'Google Meet', icon: '🟢' },
  { value: 'zoom',        label: 'Zoom',         icon: '🔵' },
  { value: 'teams',       label: 'MS Teams',     icon: '🟣' },
]

const DURATIONS: { value: 15 | 30 | 45 | 60; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function todayKey(): string { return new Date().toISOString().split('T')[0] }

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    cells.push(`${year}-${mm}-${dd}`)
  }
  return cells
}

export default function MeetingScheduler({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [type, setType] = useState<MeetingType | null>(null)

  /* ── Common fields ─────────────────────────────────────────────────────── */
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [details, setDetails] = useState('')

  /* ── Recruiter-only fields ─────────────────────────────────────────────── */
  const [companyName, setCompanyName] = useState('')
  const [jobRole, setJobRole] = useState('')

  /* ── OTP state (recruiter only) ───────────────────────────────────────── */
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpCooldown, setOtpCooldown] = useState(0)

  /* ── Duration / Date / Slot picking ───────────────────────────────────── */
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(30)
  const [visitorTz, setVisitorTz] = useState('UTC')
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const [monthSummary, setMonthSummary] = useState<Record<string, number>>({})
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<GeneratedSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null)
  const [bufferMinutes, setBufferMinutes] = useState(10)
  const [platform, setPlatform] = useState<Platform>('google_meet')

  /* ── Submit ────────────────────────────────────────────────────────────── */
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)

  /* Auto-detect visitor's timezone once, for display + email conversion */
  useEffect(() => {
    try { setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone) } catch {}
  }, [])

  /* Reset OTP verification whenever the email changes after being verified */
  useEffect(() => {
    if (otpVerified) { setOtpVerified(false); setOtpSent(false); setVerificationToken(null); setOtpCode(''); setOtpError(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  /* OTP resend cooldown ticker */
  useEffect(() => {
    if (otpCooldown <= 0) return
    const t = setTimeout(() => setOtpCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [otpCooldown])

  /* ── Fetch which days this month have any room, whenever duration/month changes ── */
  useEffect(() => {
    if (step !== 2) return
    let cancelled = false
    setSummaryLoading(true)
    const from = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
    const to = new Date(calYear, calMonth + 1, 0).toISOString().split('T')[0]
    fetch(`/api/meetings/availability?summary=1&from=${from}&to=${to}&duration=${duration}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) { setMonthSummary(data.summary || {}); setBufferMinutes(data.buffer_minutes ?? 10) } })
      .catch(() => { if (!cancelled) setMonthSummary({}) })
      .finally(() => { if (!cancelled) setSummaryLoading(false) })
    return () => { cancelled = true }
  }, [step, calYear, calMonth, duration])

  /* ── Fetch dynamically generated slots once a date is picked ─────────── */
  useEffect(() => {
    if (step !== 3 || !selectedDate) return
    let cancelled = false
    setSlotsLoading(true)
    fetch(`/api/meetings/availability?date=${selectedDate}&duration=${duration}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) { setSlots(data.slots || []); setBufferMinutes(data.buffer_minutes ?? 10) } })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setSlotsLoading(false) })
    return () => { cancelled = true }
  }, [step, selectedDate, duration])

  const monthGrid = useMemo(() => buildMonthGrid(calYear, calMonth), [calYear, calMonth])
  const minMonthKey = todayKey().slice(0, 7)
  const thisMonthKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
  const isPastMonth = thisMonthKey < minMonthKey

  /* ── OTP handlers ──────────────────────────────────────────────────────── */
  const sendOtp = useCallback(async () => {
    setOtpError(null)
    if (!EMAIL_RE.test(email.trim())) { setOtpError('Enter a valid email address first'); return }
    if (!companyName.trim()) { setOtpError('Enter your company name first'); return }
    setOtpSending(true)
    try {
      const res = await fetch('/api/meetings/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), company: companyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setOtpError(data.error || 'Could not send verification code'); return }
      setOtpSent(true)
      setOtpCooldown(60)
    } catch {
      setOtpError('Network error — please try again')
    } finally {
      setOtpSending(false)
    }
  }, [email, companyName])

  const verifyOtp = useCallback(async () => {
    setOtpError(null)
    if (!otpCode.trim() || otpCode.trim().length !== 6) { setOtpError('Enter the 6-digit code'); return }
    setOtpVerifying(true)
    try {
      const res = await fetch('/api/meetings/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otpCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setOtpError(data.error || 'Verification failed'); return }
      setOtpVerified(true)
      setVerificationToken(data.token)
    } catch {
      setOtpError('Network error — please try again')
    } finally {
      setOtpVerifying(false)
    }
  }, [email, otpCode])

  /* ── Step validity ─────────────────────────────────────────────────────── */
  const step3Valid = !!selectedSlot && !!platform
  const step4Valid = type === 'recruiter'
    ? fullName.trim() && EMAIL_RE.test(email.trim()) && companyName.trim() && jobRole.trim() && otpVerified
    : !!type && fullName.trim() && EMAIL_RE.test(email.trim()) && details.trim()

  /* ── Submit ────────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!type || !selectedSlot || !selectedDate) return
    setSubmitting(true); setError(null)
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, full_name: fullName.trim(), email: email.trim(), phone: phone.trim() || undefined,
          details: details.trim() || undefined,
          company_name: type === 'recruiter' ? companyName.trim() : undefined,
          job_role: type === 'recruiter' ? jobRole.trim() : undefined,
          slot_date: selectedDate, start_time: selectedSlot.start_time, duration_minutes: duration,
          platform, visitor_timezone: visitorTz,
          verification_token: type === 'recruiter' ? verificationToken : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        // If the slot vanished underneath them, kick back to slot picking with a refresh.
        if (res.status === 409) {
          setSelectedSlot(null)
          setStep(3)
        }
        setSubmitting(false)
        return
      }
      setRequestId(data.request?.id || null)
      setStep(6)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => { onClose?.() }

  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Progress dots */}
      {step < 6 && (
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-7 bg-blue-500' : s < step ? 'w-3.5 bg-blue-500/50' : 'w-3.5 bg-white/10'}`} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ════════════════════════════════════════════════════════════════
            STEP 1 — Duration
            ════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2"><Timer className="w-4 h-4 text-blue-400" /> How much time do you need?</h3>
              <p className="text-xs text-white/40 mt-1">Pick a duration to see available times.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DURATIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                  className={`flex flex-col items-center justify-center gap-1 py-5 rounded-2xl border text-sm font-semibold transition-all ${
                    duration === d.value ? 'border-blue-500/60 bg-blue-600/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                  }`}>
                  <Clock className="w-4 h-4" />
                  {d.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStep(2)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
              Next: Pick a Date →
            </button>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 2 — Date
            ════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> {duration} min meeting
            </button>

            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /> Pick a date</h3>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => {
                  const m = calMonth === 0 ? 11 : calMonth - 1
                  setCalMonth(m); setCalYear(calMonth === 0 ? calYear - 1 : calYear)
                }} className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-white/60 w-28 text-center">
                  {new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" onClick={() => {
                  const m = calMonth === 11 ? 0 : calMonth + 1
                  setCalMonth(m); setCalYear(calMonth === 11 ? calYear + 1 : calYear)
                }} className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {summaryLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-white/30 font-medium mb-1">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.map((dateKey, i) => {
                    if (!dateKey) return <div key={i} />
                    const count = monthSummary[dateKey] || 0
                    const isPast = dateKey < todayKey()
                    const available = !isPast && count > 0
                    const selected = dateKey === selectedDate
                    const dayNum = Number(dateKey.split('-')[2])
                    return (
                      <button key={dateKey} type="button" disabled={!available}
                        onClick={() => { setSelectedDate(dateKey); setSelectedSlot(null) }}
                        className={`relative aspect-square flex items-center justify-center text-xs font-medium rounded-lg transition-all ${
                          selected ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900' :
                          available ? 'bg-green-500/10 text-green-300 hover:bg-green-500/20 cursor-pointer' :
                          'text-white/15 cursor-not-allowed'
                        }`}>
                        {dayNum}
                        {available && !selected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />}
                      </button>
                    )
                  })}
                </div>
                {!isPastMonth && Object.keys(monthSummary).length === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" /> No open days this month for a {duration}-min meeting — try another month or a shorter duration.
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-white/30">
              <Globe className="w-3 h-3" /> Times shown in your local timezone ({visitorTz.replace('_', ' ')})
            </div>

            <button type="button" onClick={() => setStep(3)} disabled={!selectedDate}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm">
              Next: Pick a Time →
            </button>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 3 — Time slot + platform
            ════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> {selectedDateLabel}
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /> Available times</h3>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : slots.length === 0 ? (
              <div className="flex items-start gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" /> All slots for this day are taken. Please choose another date.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map(s => (
                    <button key={s.start_time} type="button" onClick={() => setSelectedSlot(s)}
                      className={`flex flex-col items-center py-2.5 rounded-lg border text-xs font-medium transition-all ${
                        selectedSlot?.start_time === s.start_time ? 'border-blue-500/60 bg-blue-600/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                      }`}>
                      <span>{formatTimeLabel(s.start_time)}</span>
                      <span className="text-[10px] opacity-60 mt-0.5">– {formatTimeLabel(s.end_time)}</span>
                    </button>
                  ))}
                </div>

                {selectedSlot && (
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Meeting runs <strong>{formatTimeLabel(selectedSlot.start_time)}–{formatTimeLabel(selectedSlot.end_time)}</strong>, then a {bufferMinutes}-min buffer until <strong>{formatTimeLabel(selectedSlot.buffer_until)}</strong> before the next slot opens up.
                  </div>
                )}

                {/* Platform */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/50 mb-2"><Video className="w-3.5 h-3.5" /> Platform</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLATFORMS.map(p => (
                      <button key={p.value} type="button" onClick={() => setPlatform(p.value)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[11px] font-medium transition-all ${
                          platform === p.value ? 'border-blue-500/60 bg-blue-600/20 text-white' : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20'
                        }`}>
                        <span className="text-base">{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)}
                className="px-4 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setStep(4)} disabled={!step3Valid}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm">
                Next: Your Details →
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 4 — Type selection + details (+ OTP for recruiter)
            ════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {!type ? (
              <>
                <button type="button" onClick={() => setStep(3)} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Change time
                </button>
                <h3 className="text-base font-bold text-white">What's this about?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => setType('recruiter')}
                    className="flex flex-col items-start gap-2 p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-left">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center"><RecruiterIcon className="w-5 h-5 text-blue-400" /></div>
                    <div>
                      <p className="font-semibold text-white text-sm">Recruiter / Interview</p>
                      <p className="text-xs text-white/40 mt-0.5">Job or technical interview</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => setType('freelance')}
                    className="flex flex-col items-start gap-2 p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center"><Sparkles className="w-5 h-5 text-purple-400" /></div>
                    <div>
                      <p className="font-semibold text-white text-sm">Freelance / Consultation</p>
                      <p className="text-xs text-white/40 mt-0.5">Project discussion or advice</p>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setType(null)} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Change type
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Full Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Phone <span className="text-white/25">(optional)</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 transition-colors" />
                    </div>
                  </div>
                </div>

                {type === 'recruiter' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">Company Name <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                            placeholder="e.g. Amazon, TCS"
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 transition-colors" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">Position / Job Role <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input type="text" value={jobRole} onChange={e => setJobRole(e.target.value)}
                            placeholder="e.g. Recruiter, HR Manager"
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Official email + OTP */}
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Official Company Email <span className="text-red-400">*</span></label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={otpVerified}
                            placeholder="you@company.com"
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 transition-colors disabled:opacity-60" />
                        </div>
                        {!otpVerified && (
                          <button type="button" onClick={sendOtp} disabled={otpSending || otpCooldown > 0}
                            className="px-4 py-2.5 bg-blue-600/20 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-semibold hover:bg-blue-600/30 disabled:opacity-40 transition-colors whitespace-nowrap">
                            {otpSending ? <Loader2 className="w-4 h-4 animate-spin" /> : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : otpSent ? 'Resend Code' : 'Send Code'}
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-white/25 mt-1">Personal emails (Gmail, Yahoo, Outlook, etc.) aren't accepted — we verify with a one-time code.</p>

                      {otpVerified ? (
                        <p className="text-[11px] mt-2 text-green-400 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Email verified</p>
                      ) : otpSent ? (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="relative flex-1">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
                              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                              placeholder="6-digit code"
                              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 tracking-widest focus:outline-none focus:border-blue-500/60 transition-colors" />
                          </div>
                          <button type="button" onClick={verifyOtp} disabled={otpVerifying || otpCode.length !== 6}
                            className="px-4 py-2.5 bg-green-600/20 border border-green-500/40 text-green-300 rounded-xl text-xs font-semibold hover:bg-green-600/30 disabled:opacity-40 transition-colors whitespace-nowrap">
                            {otpVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                          </button>
                        </div>
                      ) : null}
                      {otpError && (
                        <p className="text-[11px] mt-2 text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {otpError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Purpose of Meeting</label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                        <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
                          placeholder="Role details, interview round, what to expect..."
                          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 transition-colors resize-none" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Personal Email <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Project / Consultation Details <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                        <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4}
                          placeholder="Project scope, timeline, tech stack, or what you'd like advice on..."
                          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 transition-colors resize-none" />
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}</p>
                )}

                <button type="button" onClick={() => { setError(null); setStep(5) }} disabled={!step4Valid}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm">
                  Next: Review →
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 5 — Review & submit
            ════════════════════════════════════════════════════════════════ */}
        {step === 5 && selectedSlot && (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              {[
                { label: 'Type', value: type === 'recruiter' ? 'Recruiter / Interview' : 'Freelance / Consultation' },
                { label: 'Name', value: fullName },
                { label: 'Email', value: email },
                type === 'recruiter' && { label: 'Company', value: companyName },
                type === 'recruiter' && { label: 'Role', value: jobRole },
                phone.trim() && { label: 'Phone', value: phone },
                { label: 'Date', value: selectedDateLabel },
                { label: 'Time', value: `${formatTimeLabel(selectedSlot.start_time)} – ${formatTimeLabel(selectedSlot.end_time)}` },
                { label: 'Duration', value: `${duration} min` },
                { label: 'Buffer after', value: `${bufferMinutes} min (until ${formatTimeLabel(selectedSlot.buffer_until)})` },
                { label: 'Your timezone', value: visitorTz },
                { label: 'Platform', value: PLATFORMS.find(p => p.value === platform)?.label },
              ].filter(Boolean).map((row: any, i) => (
                <div key={i} className="flex justify-between text-sm gap-3">
                  <span className="text-white/40">{row.label}</span>
                  <span className="text-white font-medium text-right">{row.value}</span>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}</p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(4)} disabled={submitting}
                className="px-4 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors text-sm disabled:opacity-40">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Request'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 6 — Success
            ════════════════════════════════════════════════════════════════ */}
        {step === 6 && (
          <motion.div key="step6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Request Submitted!</h3>
              <p className="text-sm text-white/50 mt-1">We've sent a confirmation to <span className="text-white/80">{email}</span>. You'll hear back once it's reviewed.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              ⏳ Pending Review
            </div>
            {requestId && <p className="text-[11px] text-white/25">Reference ID: {requestId}</p>}
            <button type="button" onClick={handleClose}
              className="block w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-colors text-sm mt-2">
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
