'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Shield, Lock, User, AlertCircle, Loader2, Mail, KeyRound, CheckCircle2, ArrowLeft, Sparkles, Rocket, LayoutDashboard } from 'lucide-react'

type Step = 'role' | 'credentials' | 'otp' | 'success'
  | 'coadmin-relation' | 'coadmin-credentials' | 'coadmin-question' | 'coadmin-blocked' | 'coadmin-disabled'

const RELATIONS = ['Wife', 'Brother', 'Sister', 'Friend', 'Child', 'Parent', 'Other']

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin/dashboard'

  const [step, setStep] = useState<Step>('role')
  const [form, setForm] = useState({ username: '', password: '' })
  const [otp, setOtp] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // ── Co-admin flow state ──────────────────────────────────────────────────
  const [coRelation, setCoRelation] = useState('')
  const [coForm, setCoForm] = useState({ username: '', password: '' })
  const [coQuestion, setCoQuestion] = useState('')
  const [coAnswer, setCoAnswer] = useState('')
  const [coAttemptsLeft, setCoAttemptsLeft] = useState<number | null>(null)
  const [coName, setCoName] = useState('')
  const [coRequestSent, setCoRequestSent] = useState(false)

  useEffect(() => setMounted(true), [])

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  // Step 1: verify credentials → get needsOtp back
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Please fill in both fields.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.needsOtp) {
        setMaskedEmail(data.maskedEmail || '')
        setStep('otp')
      } else if (data.success) {
        setStep('success')
        setTimeout(() => router.push(redirect), 3200)
      } else {
        setError(data.message || 'Invalid credentials.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Send OTP email
  const handleSendOtp = async () => {
    if (countdown > 0) return
    setSendingOtp(true)
    setError('')
    try {
      const res = await fetch('/api/admin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) {
        setOtpSent(true)
        setCountdown(60)
      } else {
        setError(data.message || 'Failed to send OTP.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSendingOtp(false)
    }
  }

  // Step 2: verify OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, otp }),
      })
      const data = await res.json()
      if (data.success) {
        setStep('success')
        setTimeout(() => router.push(redirect), 3200)
      } else {
        setError(data.message || 'Invalid OTP.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  // ── Co-admin flow handlers ────────────────────────────────────────────────
  const handleCoCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coForm.username || !coForm.password) { setError('Please fill in both fields.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/co-admin-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'credentials', relation: coRelation, username: coForm.username, password: coForm.password }),
      })
      const data = await res.json()
      if (data.blocked) { setCoName(coForm.username); setStep('coadmin-blocked'); return }
      if (data.disabled) { setCoName(coForm.username); setStep('coadmin-disabled'); return }
      if (data.ok) { setCoQuestion(data.question); setStep('coadmin-question') }
      else setError(data.error || 'Invalid credentials.')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCoAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coAnswer.trim()) { setError('Please enter your answer.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/co-admin-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'answer', username: coForm.username, answer: coAnswer }),
      })
      const data = await res.json()
      if (data.blocked) { setStep('coadmin-blocked'); return }
      if (data.ok) { setStep('success'); setTimeout(() => router.push(redirect), 2200); return }
      setCoAttemptsLeft(typeof data.attemptsLeft === 'number' ? data.attemptsLeft : null)
      setError(data.error || 'Incorrect answer.')
      setCoAnswer('')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestEnable = async () => {
    setLoading(true)
    try {
      await fetch('/api/admin/co-admin-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'request_enable', username: coName }),
      })
      setCoRequestSent(true)
    } catch {}
    setLoading(false)
  }

  const resetCoFlow = () => {
    setStep('role'); setError(''); setCoRelation(''); setCoForm({ username: '', password: '' })
    setCoQuestion(''); setCoAnswer(''); setCoAttemptsLeft(null); setCoRequestSent(false)
  }

  // ── Success onboarding animation ──────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated bg */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 4, opacity: 0.15 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
          />
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0, x: '50vw' }}
              animate={{ opacity: [0, 1, 0], y: -300 - Math.random() * 200, x: `${30 + Math.random() * 40}vw` }}
              transition={{ delay: i * 0.15, duration: 1.8, ease: 'easeOut' }}
              style={{ position: 'absolute', bottom: '40%' }}
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 text-center max-w-sm mx-auto">
          {/* Success ring */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
            className="w-28 h-28 mx-auto mb-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
            >
              <CheckCircle2 className="w-14 h-14 text-white" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-3xl font-black text-white mb-2">Welcome Back!</h2>
            <p className="text-slate-400 text-sm mb-6">Credentials verified. Preparing your admin panel…</p>
          </motion.div>

          {/* Onboarding steps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="space-y-3 mb-8"
          >
            {[
              { label: 'Authentication verified', icon: Shield, delay: 1.0 },
              { label: 'Loading dashboard data', icon: LayoutDashboard, delay: 1.4 },
              { label: 'Launching admin panel', icon: Rocket, delay: 1.8 },
            ].map(({ label, icon: Icon, delay }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay }}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
              >
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-slate-300 font-medium">{label}</span>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.3 }}
                  className="ml-auto"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="h-1.5 bg-white/10 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.8, ease: 'easeInOut', delay: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xs text-slate-500 mt-2"
          >Redirecting to Admin Dashboard…</motion.p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Step indicator (admin credential flow only) */}
        {(step === 'credentials' || step === 'otp') && (
          <div className="flex items-center justify-center gap-3 mb-6">
            {['credentials', 'otp'].map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30' :
                  (i === 0 && step === 'otp') ? 'bg-green-500 text-white' : 'bg-white/10 text-white/30'
                }`}>
                  {i === 0 && step === 'otp' ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < 1 && <div className={`w-8 h-0.5 transition-all ${step === 'otp' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 mb-4 shadow-lg shadow-blue-500/30"
            >
              {step === 'credentials' || step === 'role' ? <Shield className="w-8 h-8 text-white" /> : <KeyRound className="w-8 h-8 text-white" />}
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {step === 'role' ? 'Who are you?'
                : step === 'credentials' ? 'Admin Portal'
                : step === 'otp' ? 'Email Verification'
                : step === 'coadmin-relation' ? 'Your Relation'
                : step === 'coadmin-credentials' ? 'Co-Admin Login'
                : step === 'coadmin-question' ? 'Security Question'
                : step === 'coadmin-blocked' ? 'Account Blocked'
                : step === 'coadmin-disabled' ? 'Account Disabled'
                : ''}
            </h1>
            <p className="text-sm text-white/40">
              {step === 'role' ? 'Choose how you want to sign in'
                : step === 'credentials' ? 'Enter your credentials to continue'
                : step === 'otp' ? (maskedEmail ? `OTP will be sent to ${maskedEmail}` : 'Verify your identity')
                : step === 'coadmin-relation' ? 'What is your relation with Abhishek Singh?'
                : step === 'coadmin-credentials' ? 'Enter the username & password you were given'
                : step === 'coadmin-question' ? 'Answer the question set for your account'
                : step === 'coadmin-blocked' ? 'Only the real admin can unblock this account'
                : step === 'coadmin-disabled' ? 'This account has been disabled by the admin'
                : ''}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* ─── STEP 0: Who are you? ────────────────────────────────── */}
            {step === 'role' && (
              <motion.div key="role" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <button
                  onClick={() => setStep('credentials')}
                  className="w-full flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-blue-500/40 rounded-xl px-5 py-4 text-left transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Admin</p>
                    <p className="text-white/40 text-xs">Log in with the original admin account</p>
                  </div>
                </button>
                <button
                  onClick={() => setStep('coadmin-relation')}
                  className="w-full flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-violet-500/40 rounded-xl px-5 py-4 text-left transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Co-Admin</p>
                    <p className="text-white/40 text-xs">Log in with a temporary/restricted account</p>
                  </div>
                </button>
              </motion.div>
            )}

            {/* ─── Co-admin STEP 1: Relation ───────────────────────────── */}
            {step === 'coadmin-relation' && (
              <motion.div key="coadmin-relation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  {RELATIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => { setCoRelation(r); setStep('coadmin-credentials'); setError('') }}
                      className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-violet-500/40 rounded-xl py-3 text-sm text-white font-medium transition-all"
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setStep('role'); setError('') }} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto mt-2">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              </motion.div>
            )}

            {/* ─── Co-admin STEP 2: Credentials ────────────────────────── */}
            {step === 'coadmin-credentials' && (
              <motion.form key="coadmin-credentials" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleCoCredentialsSubmit} className="space-y-4">
                <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2.5">
                  <User className="w-4 h-4 text-violet-300 flex-shrink-0" />
                  <p className="text-violet-200 text-xs">Relation: <strong>{coRelation}</strong></p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text" autoComplete="username" value={coForm.username}
                      onChange={e => { setCoForm(f => ({ ...f, username: e.target.value })); setError('') }}
                      placeholder="Enter username"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type={showPw ? 'text' : 'password'} autoComplete="current-password" value={coForm.password}
                      onChange={e => { setCoForm(f => ({ ...f, password: e.target.value })); setError('') }}
                      placeholder="Enter password"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.08] transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 mt-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : 'Continue →'}
                </button>
                <button type="button" onClick={() => { setStep('coadmin-relation'); setError('') }} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              </motion.form>
            )}

            {/* ─── Co-admin STEP 3: Security question ──────────────────── */}
            {step === 'coadmin-question' && (
              <motion.form key="coadmin-question" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleCoAnswerSubmit} className="space-y-4">
                <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                  <p className="text-sm text-white/70 font-medium">{coQuestion}</p>
                </div>
                <input
                  type="text" value={coAnswer} onChange={e => { setCoAnswer(e.target.value); setError('') }}
                  placeholder="Your answer" autoFocus
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.08] transition-all"
                />
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}
                {coAttemptsLeft !== null && (
                  <p className="text-center text-xs text-amber-400">⚠️ {coAttemptsLeft} attempt{coAttemptsLeft === 1 ? '' : 's'} left before this account is blocked.</p>
                )}
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : <><KeyRound className="w-4 h-4" />Verify & Login</>}
                </button>
                <button type="button" onClick={resetCoFlow} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Start over
                </button>
              </motion.form>
            )}

            {/* ─── Co-admin: blocked ────────────────────────────────────── */}
            {step === 'coadmin-blocked' && (
              <motion.div key="coadmin-blocked" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <p className="text-sm text-white/60">
                  This account got the security question wrong too many times and has been blocked. Only the real admin can unblock it from the dashboard.
                </p>
                <button onClick={resetCoFlow} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Back to start
                </button>
              </motion.div>
            )}

            {/* ─── Co-admin: disabled ───────────────────────────────────── */}
            {step === 'coadmin-disabled' && (
              <motion.div key="coadmin-disabled" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 text-center">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="text-sm text-white/60">
                  This account has been disabled by the admin. You can send a request asking them to re-enable it.
                </p>
                {coRequestSent ? (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm justify-center">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Request sent to the admin.
                  </div>
                ) : (
                  <button onClick={handleRequestEnable} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
                    {loading ? 'Sending…' : 'Request to be Re-Enabled'}
                  </button>
                )}
                <button onClick={resetCoFlow} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Back to start
                </button>
              </motion.div>
            )}

            {step === 'credentials' && (
              <motion.form
                key="credentials"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleCredentialsSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      name="username"
                      type="text"
                      autoComplete="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="Enter username"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      name="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 mt-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : 'Continue →'}
                </button>
                <button type="button" onClick={() => { setStep('role'); setError('') }} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              </motion.form>
            )}

            {/* ─── STEP 2: OTP ─────────────────────────────────────────── */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Get OTP button */}
                {!otpSent ? (
                  <div className="text-center space-y-3">
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <Mail className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-sm text-white/60">
                        We&apos;ll send a 6-digit OTP to your registered email address.
                      </p>
                      {maskedEmail && (
                        <p className="text-xs text-white/40 mt-1 font-mono">{maskedEmail}</p>
                      )}
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                    >
                      {sendingOtp ? <><Loader2 className="w-4 h-4 animate-spin" />Sending OTP…</> : <><Mail className="w-4 h-4" />Get OTP on Email</>}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <p className="text-green-400 text-sm">OTP sent! Check your email inbox.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                        placeholder="000000"
                        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-white/20 text-2xl font-mono tracking-[0.5em] text-center focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] transition-all"
                        autoFocus
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button type="submit" disabled={loading || otp.length !== 6}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25">
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : <><KeyRound className="w-4 h-4" />Verify & Login</>}
                    </button>

                    <button type="button" onClick={handleSendOtp} disabled={countdown > 0 || sendingOtp}
                      className="w-full text-sm text-white/40 hover:text-white/60 disabled:cursor-not-allowed transition-colors py-1">
                      {countdown > 0 ? `Resend OTP in ${countdown}s` : sendingOtp ? 'Sending…' : 'Resend OTP'}
                    </button>
                  </form>
                )}

                {/* Back */}
                <button onClick={() => { setStep('credentials'); setError(''); setOtp(''); setOtpSent(false) }}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Back to credentials
                </button>

                <AnimatePresence>
                  {error && !otpSent && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          ← <a href="/" className="hover:text-white/40 transition-colors underline underline-offset-2">Back to Portfolio</a>
        </p>
      </motion.div>
    </div>
  )
}
