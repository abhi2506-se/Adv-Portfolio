'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Mail, Linkedin, Github, Instagram, Send, CheckCircle, Loader2, MapPin, AlertTriangle, Facebook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePortfolioData } from '@/hooks/usePortfolioData'
import { containsAbuse, reportActivity } from '@/components/suspicious-activity-detector'
import { isWhitelistedName } from '@/lib/security-whitelist'
import { useLanguage } from '@/lib/language-context'

const USER_SESSION_KEY = 'portfolio_user_session_v1'

export function Contact() {
  const { hero } = usePortfolioData()
  const { t } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [honeypot, setHoneypot] = useState('')  // bot trap — must remain empty
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'abuse'>('idle')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [abuseWord, setAbuseWord] = useState('')

  // Auto-fill name & email from logged-in user session
  useEffect(() => {
    const fillFromSession = () => {
      try {
        const session = localStorage.getItem(USER_SESSION_KEY)
        if (session) {
          const u = JSON.parse(session)
          if (u?.id && u?.email) {
            const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
            setForm(f => ({
              ...f,
              name: fullName || f.name,
              email: u.email || f.email,
            }))
            setIsLoggedIn(true)
          }
        }
      } catch {}
    }
    fillFromSession()
    // Re-fill when user logs in during this session
    window.addEventListener('portfolio_login', fillFromSession)
    window.addEventListener('portfolio_logout', () => { setIsLoggedIn(false) })
    return () => {
      window.removeEventListener('portfolio_login', fillFromSession)
    }
  }, [])

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }
  const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25,0.46,0.45,0.94] } } }

  const LeetCodeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/>
    </svg>
  )
  const h = hero as typeof hero & { facebook?: string; leetcode?: string }
  const contactMethods = [
    hero.location  && { icon: MapPin,       label: t('contact.method.location'),  value: hero.location,              href: `https://maps.google.com/?q=${encodeURIComponent(hero.location || '')}`, color: 'from-emerald-600 to-teal-500' },
    hero.email     && { icon: Mail,         label: t('contact.method.email'),     value: hero.email,                 href: `mailto:${hero.email}`,   color: 'from-blue-600 to-cyan-500' },
    hero.linkedin  && { icon: Linkedin,     label: 'LinkedIn',  value: t('contact.method.linkedin'),      href: hero.linkedin,             color: 'from-blue-700 to-blue-500' },
    hero.github    && { icon: Github,       label: 'GitHub',    value: t('contact.method.github'),     href: hero.github,               color: 'from-slate-700 to-slate-500' },
    hero.instagram && { icon: Instagram,    label: 'Instagram', value: t('contact.method.instagram'),      href: hero.instagram,            color: 'from-pink-600 to-orange-500' },
    h.facebook     && { icon: Facebook,     label: 'Facebook',  value: t('contact.method.facebook'),      href: h.facebook,                color: 'from-blue-600 to-blue-400' },
    h.leetcode     && { icon: LeetCodeIcon, label: 'LeetCode',  value: t('contact.method.leetcode'),    href: h.leetcode,                color: 'from-yellow-600 to-orange-500' },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href: string; color: string }[]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return

    // Honeypot — bots fill hidden fields, humans don't
    if (honeypot) return

    // Abuse detection — block INSTANTLY before any message is sent
    // (skipped entirely for whitelisted names)
    const combinedText = `${form.name} ${form.email} ${form.subject} ${form.message}`
    const detected = !isWhitelistedName(form.name) && containsAbuse(combinedText)
    if (detected) {
      const detectedWord = typeof detected === 'string' ? detected : ''
      setAbuseWord(detectedWord)
      setStatus('abuse')
      // Report with full detail — IP + location fetched server-side, reason includes field breakdown
      const detailedReason = [
        `Abusive language detected in contact form BEFORE message was sent.`,
        `Sender: "${form.name}" <${form.email}>`,
        `Subject: "${form.subject || '(none)'}"`,
        `Abusive snippet: "${combinedText.slice(0, 200)}"`,
        `Detected word/pattern: "${detectedWord}"`,
        `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      ].join(' | ')
      reportActivity('ABUSIVE_LANGUAGE_CONTACT_FORM', detailedReason).catch(() => {})
      // Do NOT send the message — return immediately
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setStatus('sent'); setForm(f => ({ ...f, subject: '', message: '' })) }
      else setStatus('error')
    } catch { setStatus('error') }
    setTimeout(() => setStatus('idle'), 4000)
  }

  return (
    <motion.section
      id="contact"
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={container}
      className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto"
    >
      <motion.div variants={fadeUp} className="mb-12">
        <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">{t('contact.eyebrow')}</span>
        <h2 className="text-4xl md:text-5xl font-bold mt-2">
          {t('contact.title.get_in')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t('contact.title.touch')}</span>
        </h2>
        <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl">
          {t('contact.subtitle')}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-14">
        {/* Contact cards */}
        <motion.div variants={fadeUp} className="space-y-4">
          {contactMethods.map((method, i) => {
            const Icon = method.icon
            return (
              <motion.a
                key={i}
                href={method.href}
                target={method.href.startsWith('mailto') ? undefined : '_blank'}
                rel="noopener noreferrer"
                whileHover={{ x: 6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="flex items-center gap-4 p-4 bg-secondary rounded-2xl border border-border hover:border-blue-600/30 hover:shadow-md transition-all group"
              >
                <div className={`p-3 bg-gradient-to-br ${method.color} rounded-xl text-white shadow-md flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{method.label}</p>
                  <p className="font-semibold text-sm group-hover:text-blue-600 transition-colors truncate">{method.value}</p>
                </div>
                <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="ml-auto text-muted-foreground/40 group-hover:text-blue-600/60 flex-shrink-0">
                  →
                </motion.div>
              </motion.a>
            )
          })}
        </motion.div>

        {/* Contact form */}
        <motion.div variants={fadeUp} className="bg-secondary rounded-2xl p-6 md:p-8 border border-border">
          <h3 className="text-xl font-bold mb-1">{t('contact.form.title')}</h3>
          {isLoggedIn && (
            <p className="text-xs text-blue-500 mb-4 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {t('contact.form.autofilled')}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot — visually hidden, only bots fill this */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
              <label htmlFor="hp_website">Website</label>
              <input
                id="hp_website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
              />
            </div>
            {[
              { key: 'name',    label: t('contact.form.name'),    type: 'text',  placeholder: 'Rahul Sharma',   readOnly: isLoggedIn },
              { key: 'email',   label: t('contact.form.email'), type: 'email', placeholder: 'rahul@example.com', readOnly: isLoggedIn },
              { key: 'subject', label: t('contact.form.subject'),      type: 'text', placeholder: t('contact.form.subject_placeholder'), readOnly: false },
            ].map(field => (
              <div key={field.key}>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={(form as Record<string,string>)[field.key]}
                  onChange={e => !field.readOnly && setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  readOnly={field.readOnly}
                  className={`w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600/50 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder-muted-foreground/50 ${field.readOnly ? 'opacity-70 cursor-default' : ''}`}
                />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('contact.form.message')}</label>
              <textarea
                rows={4}
                placeholder={t('contact.form.message_placeholder')}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600/50 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder-muted-foreground/50 resize-none"
              />
            </div>

            <AnimatePresence mode="wait">
              {status === 'sent' ? (
                <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> {t('contact.form.sent')}
                </motion.div>
              ) : status === 'abuse' ? (
                <motion.div key="abuse" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {t('contact.form.abuse1')}{abuseWord ? (<> (<strong>&quot;{abuseWord}&quot;</strong>)</>) : ''}.
                    {' '}{t('contact.form.abuse2')} <strong>{t('contact.form.abuse3')}</strong> {t('contact.form.abuse4')}
                  </span>
                </motion.div>
              ) : status === 'error' ? (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                  {t('contact.form.error')}
                </motion.div>
              ) : (
                <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button type="submit" disabled={status === 'sending'} className="w-full gap-2 shadow-lg shadow-blue-600/20">
                    {status === 'sending' ? <><Loader2 className="w-4 h-4 animate-spin" />{t('contact.form.sending')}</> : <><Send className="w-4 h-4" />{t('contact.form.send')}</>}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>
    </motion.section>
  )
}
