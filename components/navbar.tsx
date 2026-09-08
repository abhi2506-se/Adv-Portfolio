'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Menu, X, Moon, Sun, Compass, AlertTriangle, LogOut, User, LogIn, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { openAuthModal } from '@/components/first-visit-terms'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLanguage } from '@/lib/language-context'

const USER_SESSION_KEY = 'portfolio_user_session_v1'

const NAV_KEYS = [
  { key: 'nav.about',      href: '#about' },
  { key: 'nav.skills',     href: '#skills' },
  { key: 'nav.experience', href: '#experience' },
  { key: 'nav.projects',   href: '#projects' },
  { key: 'nav.devops',     href: '#devops' },
  { key: 'nav.blog',       href: '#blog' },
  { key: 'nav.contact',    href: '#contact' },
  { key: 'nav.audit',      href: '#audit' },
]

export function Navbar() {
  const router = useRouter()
  const [isOpen, setIsOpen]       = useState(false)
  const [isScrolled, setScrolled] = useState(false)
  const [active, setActive]       = useState('')
  const { theme, setTheme }       = useTheme()
  const [mounted, setMounted]     = useState(false)
  const { t } = useLanguage()
  const navItems = NAV_KEYS.map(n => ({ label: t(n.key), href: n.href }))
  const [calendlyUrl, setCalendlyUrl] = useState('https://calendly.com')
  const [userSession, setUserSession] = useState<{ first_name?: string; email?: string } | null>(null)
  const { scrollY, scrollYProgress } = useScroll()
  const navOpacity = useTransform(scrollY, [0, 80], [0.7, 1])
  const scaleX     = useTransform(scrollYProgress, [0, 1], [0, 1])

  useEffect(() => {
    setMounted(true)
    // Read logged-in user session
    try {
      const raw = localStorage.getItem(USER_SESSION_KEY)
      if (raw) {
        const u = JSON.parse(raw)
        if (u?.id && u?.email) setUserSession(u)
      }
    } catch {}

    // Listen for login/logout events dispatched by first-visit-terms
    const onLogin = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) setUserSession(detail)
    }
    const onLogout = () => setUserSession(null)
    window.addEventListener('portfolio_login', onLogin)
    window.addEventListener('portfolio_logout', onLogout)
    return () => {
      window.removeEventListener('portfolio_login', onLogin)
      window.removeEventListener('portfolio_logout', onLogout)
    }
  }, [])

  const handleLogout = () => {
    if (typeof window !== 'undefined' && (window as any).__portfolioLogout) {
      (window as any).__portfolioLogout()
    } else {
      try { localStorage.removeItem(USER_SESSION_KEY) } catch {}
      setUserSession(null)
      setIsOpen(false)
      window.location.reload()
    }
  }

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.settings?.calendly_url) setCalendlyUrl(d.settings.calendly_url)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      // Highlight active section (use static hrefs, not translated labels)
      const sections = NAV_KEYS.map(i => i.href.slice(1))
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id)
        if (el && window.scrollY >= el.offsetTop - 120) { setActive(`#${id}`); break }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      setIsOpen(false)
      setActive(href)
    }
  }

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25,0.46,0.45,0.94] }}
        style={{ opacity: navOpacity }}
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-background/95 backdrop-blur-xl border-b border-border shadow-lg shadow-black/10'
            : 'bg-background/70 backdrop-blur-md'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <motion.a
            href="#"
            onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="relative text-xl font-extrabold"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">AS</span>
            <motion.span
              className="absolute -bottom-0.5 left-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"
              initial={{ width: 0 }}
              whileHover={{ width: '100%' }}
              transition={{ duration: 0.3 }}
            />
          </motion.a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <motion.a
                key={item.href}
                href={item.href}
                onClick={e => handleNavClick(e, item.href)}
                whileHover={{ y: -1 }}
                className={`relative px-3 py-2 text-sm font-medium transition-colors rounded-lg ${
                  active === item.href ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {active === item.href && (
                  <motion.span layoutId="nav-pill"
                    className="absolute inset-0 bg-secondary rounded-lg"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </motion.a>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2">
            {/* Logged-in user badge + logout / OR login button */}
            {mounted && (
              userSession ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <User className="w-3 h-3" />
                    <span className="max-w-[80px] truncate">{userSession.first_name || 'User'}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    title="Logout"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => openAuthModal('landing')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-600/15 border border-blue-500/30 hover:bg-blue-600/25 text-blue-400 text-xs font-semibold transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" /> Login / Register
                </motion.button>
              )
            )}
            <Link href="/languages">
              <motion.div
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/50 hover:from-violet-500/20 hover:to-purple-500/20 text-violet-500 text-sm font-semibold transition-all cursor-pointer"
              >
                <Languages className="w-4 h-4" />{t('nav.languages')}
              </motion.div>
            </Link>
            <Link href="/journey">
              <motion.div
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/20 hover:border-rose-500/50 hover:from-rose-500/20 hover:to-orange-500/20 text-rose-500 text-sm font-semibold transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4" />{t('nav.journey')}
              </motion.div>
            </Link>
            <LanguageSwitcher />
            {mounted && (
              <Button size="icon" variant="outline"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme" className="rounded-full">
                <AnimatePresence mode="wait">
                  {theme === 'dark'
                    ? <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><Sun className="w-4 h-4" /></motion.div>
                    : <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Moon className="w-4 h-4" /></motion.div>}
                </AnimatePresence>
              </Button>
            )}
          </div>

          {/* Mobile right */}
          <div className="md:hidden flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
            <Link href="/languages" className="flex-shrink-0">
              <div className="flex items-center gap-1 px-2.5 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-500 text-xs font-semibold h-9 whitespace-nowrap">
                <Languages className="w-3.5 h-3.5 flex-shrink-0" /><span className="hidden min-[400px]:inline">{t('nav.languages')}</span>
              </div>
            </Link>
            <Link href="/journey" className="flex-shrink-0">
              <div className="flex items-center gap-1 px-2.5 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold h-9 whitespace-nowrap">
                <Compass className="w-3.5 h-3.5 flex-shrink-0" /><span className="hidden min-[400px]:inline">{t('nav.journey')}</span>
              </div>
            </Link>
            {mounted && (
              <Button size="icon" variant="outline" className="rounded-full h-9 w-9 flex-shrink-0"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </Button>
            )}
            {/* Hamburger — always visible, no overflow clipping */}
            <button
              className="rounded-full h-9 w-9 flex-shrink-0 flex items-center justify-center border border-border bg-background hover:bg-secondary transition-colors"
              onClick={() => setIsOpen(v => !v)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isOpen
                  ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <X className="w-4 h-4" />
                    </motion.span>
                  : <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <Menu className="w-4 h-4" />
                    </motion.span>
                }
              </AnimatePresence>
            </button>
          </div>
        </div>
        {/* Scroll progress bar */}
        <motion.div
          style={{ scaleX, transformOrigin: '0%' }}
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 origin-left"
        />
      </motion.nav>

      {/* Mobile menu — rendered via portal so it's never clipped by parent overflow */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="fixed top-16 left-0 right-0 bg-background/97 backdrop-blur-xl border-b border-border md:hidden z-[49] shadow-xl"
            >
              <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-1">
                {navItems.map((item, i) => (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    onClick={e => handleNavClick(e, item.href)}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                      active === item.href
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    {item.label}
                  </motion.a>
                ))}
                {/* Language switcher in mobile menu */}
                <div className="px-4 py-2">
                  <LanguageSwitcher />
                </div>
                {/* Login / Logout in mobile menu */}
                {userSession ? (
                  <motion.button
                    onClick={handleLogout}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (navItems.length + 2) * 0.04 }}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 mt-1 w-full text-left transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout ({userSession.first_name || userSession.email})
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => { setIsOpen(false); openAuthModal('landing') }}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (navItems.length + 2) * 0.04 }}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 mt-1 w-full text-left transition-colors"
                  >
                    <LogIn className="w-4 h-4" /> Login / Register
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
