'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Code2, Briefcase, BookOpen, FolderGit2, Mail,
  LogOut, Save, Plus, Trash2, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  Eye, Shield, CheckCircle, AlertCircle, Loader2, ExternalLink,
  AlertTriangle, Wifi, WifiOff, Monitor, Globe, ShieldAlert, RefreshCcw,
  GraduationCap, Settings, Home, Pencil, X, LayoutDashboard,
  KeyRound, AtSign, RefreshCw, SendHorizonal, Lock,
  Compass, MapPin, Music, Film, Image as ImageIcon, Upload, FileText, Award, Tag, Calendar,
  UserCircle, Camera, BarChart2, MessageSquare, Phone, Bot, Download, Bell, Sparkles, Reply, Star,
  MessageCircle, Users, Send, Ban, Facebook, History, Github, Share2, Clock,
} from 'lucide-react'
import { defaultPortfolioData, getPortfolioData, savePortfolioData, type PortfolioData } from '@/lib/portfolio-data'
import { getBlogs, saveBlog, deleteBlog, getCertificates, saveCertificate, deleteCertificate, saveMedia, getMediaUrl, isVideoId, generateId, formatFileSize, getJourneyProfile, saveJourneyProfile, getStories, saveStory, deleteStory, type BlogPost, type Certificate, type JourneyMedia, type JourneyProfile, type JourneyStory } from '@/lib/journey-store'
import { COUNTRIES, getStates, getCities } from '@/lib/geo-data'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { SongPicker } from '@/components/song-picker'
import { ATSScoreWidget } from '@/components/ats-score-widget'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/song-library'
import { MeetingsAdminSectionV2 } from '@/components/dashboard/MeetingsAdminSectionV2'
import { LanguagesManager } from '@/components/admin/languages-manager'
import { AdminChatPanel } from '@/components/live-chat/admin-chat-panel'

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'overview' | 'hero' | 'about' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications' | 'journey' | 'languages_admin' | 'messages' | 'chatbot' | 'ai_conversations' | 'live_chat' | 'settings' | 'legal' | 'security' | 'github_settings' | 'portfolio_blogs' | 'testimonials_admin' | 'meetings' | 'reminders' | 'chatbot_abuse' | 'version' | 'sitemap_admin' | 'co_admins'
type Toast = { id: number; message: string; type: 'success' | 'error' }

// ─── Helper components ────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{children}</label>
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-slate-800 transition-all ${props.className ?? ''}`}
    />
  )
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-slate-800 transition-all resize-none ${props.className ?? ''}`}
    />
  )
}

function SectionCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function TestEmailButton() {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = React.useState('')
  const [diag, setDiag] = React.useState<Record<string, string> | null>(null)

  const test = async () => {
    setStatus('loading')
    setMsg('')
    setDiag(null)
    try {
      const r = await fetch('/api/admin/test-email', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setStatus('ok')
        setMsg(d.message || 'Test email sent successfully!')
      } else {
        setStatus('err')
        setMsg(d.error || 'Failed to send test email')
        if (d.diagnostics) setDiag(d.diagnostics)
      }
    } catch (e: any) {
      setStatus('err')
      setMsg(e.message || 'Request failed')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={test}
          disabled={status === 'loading'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {status === 'loading'
            ? <><Loader2 className="w-4 h-4 animate-spin" />Sending test…</>
            : <><SendHorizonal className="w-4 h-4" />Send Test Email</>}
        </button>
        <span className="text-xs text-slate-500">Verify your email configuration is working</span>
      </div>
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          status === 'ok'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {status === 'ok' ? '✅ ' : '❌ '}{msg}
        </div>
      )}
      {diag && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 space-y-1">
          {Object.entries(diag).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-slate-500 capitalize min-w-[120px]">{k.replace(/_/g, ' ')}:</span>
              <span className="text-slate-300">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const navItems: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'hero', label: 'Hero', icon: Home },
  { id: 'about', label: 'About', icon: User },
  { id: 'skills', label: 'Skills', icon: Code2 },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'journey', label: 'Journey', icon: Compass },
  { id: 'languages_admin', label: 'Languages', icon: Globe },
  { id: 'messages', label: 'Messages', icon: Mail },
  { id: 'live_chat', label: 'Live Chat', icon: MessageCircle },
  { id: 'chatbot', label: 'Chatbot Setup', icon: Bot },
  { id: 'ai_conversations', label: 'AI Conversations', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'legal', label: 'Legal Content', icon: Shield },
  { id: 'security', label: 'Security', icon: ShieldAlert },
  { id: 'github_settings', label: 'GitHub Settings', icon: Github },
  { id: 'portfolio_blogs', label: 'Blog & Articles', icon: BookOpen },
  { id: 'testimonials_admin', label: 'Testimonials', icon: MessageSquare },
  { id: 'meetings', label: 'Meetings & Interviews', icon: Calendar },
  { id: 'reminders', label: 'Reminder Status', icon: Bell },
  { id: 'chatbot_abuse', label: 'Blocked Users', icon: Ban },
  { id: 'version', label: 'Version & Changelog', icon: Share2 },
  { id: 'co_admins', label: 'Co-Admins', icon: Users },
  { id: 'sitemap_admin', label: 'Sitemap', icon: Globe },
]

// Maps each dashboard section to the co-admin permission key that unlocks
// editing it (see lib/co-admin-db.ts PERMISSION_KEYS). Sections absent from
// this map (overview, sitemap_admin, co_admins) are never editable by a
// co-admin — 'overview' and 'sitemap_admin' stay view-only, 'co_admins' is
// hidden from them entirely.
const SECTION_PERMISSION_MAP: Partial<Record<Section, string>> = {
  hero: 'hero', about: 'about', skills: 'skills', experience: 'experience', education: 'education',
  projects: 'projects', certifications: 'certifications', journey: 'journey', languages_admin: 'languages_admin',
  messages: 'messages', live_chat: 'live_chat', chatbot: 'chatbot', ai_conversations: 'ai_conversations',
  settings: 'settings', legal: 'legal', security: 'security', github_settings: 'github_settings',
  portfolio_blogs: 'portfolio_blogs', testimonials_admin: 'testimonials_admin', meetings: 'meetings',
  reminders: 'reminders', chatbot_abuse: 'chatbot_abuse', version: 'version',
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<Section>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_active_section') as Section | null
      const validSections: Section[] = ['overview','hero','about','skills','experience','education','projects','certifications','journey','languages_admin','messages','chatbot','ai_conversations','live_chat','settings','legal','security','github_settings','portfolio_blogs','testimonials_admin','meetings','project_media','reminders','chatbot_abuse','version','sitemap_admin']
      if (saved && validSections.includes(saved)) return saved
    }
    return 'overview'
  })
  const navigateSection = (section: Section) => {
    setActiveSection(section)
    if (typeof window !== 'undefined') localStorage.setItem('admin_active_section', section)
  }
  const [data, setData] = useState<PortfolioData>(defaultPortfolioData)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [saving, setSaving] = useState(false)
  // Start closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [suspiciousCount, setSuspiciousCount] = useState(0)

  // ── Co-admin mode: null = real admin (or still checking), object = logged
  //    in as a temporary co-admin with a restricted permission set. ─────────
  const [coAdminInfo, setCoAdminInfo] = useState<{ id: string; name: string; relation: string; permissions: string[] } | null>(null)
  const [coAdminChecked, setCoAdminChecked] = useState(false)
  useEffect(() => {
    fetch('/api/admin/co-admin-session')
      .then(r => r.json())
      .then(d => { if (d.loggedIn) setCoAdminInfo({ id: d.id, name: d.name, relation: d.relation, permissions: d.permissions || [] }) })
      .catch(() => {})
      .finally(() => setCoAdminChecked(true))
  }, [])
  // A co-admin can edit a section only if it's in their granted permissions.
  const canEdit = useCallback((section: Section) => {
    if (!coAdminInfo) return true // real admin — full access
    const key = SECTION_PERMISSION_MAP[section]
    return !!key && coAdminInfo.permissions.includes(key)
  }, [coAdminInfo])
  const logCoAdminActivity = useCallback((action: string, section?: string, detail?: string) => {
    if (!coAdminInfo) return
    fetch('/api/admin/co-admin-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, section, detail }),
    }).catch(() => {})
  }, [coAdminInfo])
  const [pendingLiveChatCount, setPendingLiveChatCount] = useState(0)

  // Poll for new messages count
  useEffect(() => {
    const fetchMsgCount = async () => {
      try {
        const r = await fetch('/api/contact?type=summary')
        if (r.ok) {
          const d = await r.json()
          const total = d.data?.total ?? 0
          const seen = parseInt(localStorage.getItem('_seen_msg_count') || '0', 10)
          setUnreadMsgCount(Math.max(0, total - seen))
        }
      } catch {}
    }
    fetchMsgCount()
    const interval = setInterval(fetchMsgCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Poll for suspicious activity count
  useEffect(() => {
    const fetchSuspicious = async () => {
      try {
        const r = await fetch('/api/admin/suspicious')
        if (r.ok) {
          const d = await r.json()
          const unresolved = (d.activities || []).filter((a: any) => !a.resolved).length
          setSuspiciousCount(unresolved)
        }
      } catch {}
    }
    fetchSuspicious()
    const interval = setInterval(fetchSuspicious, 20000)
    return () => clearInterval(interval)
  }, [])

  // Session heartbeat + revocation check (3-strike grace period before force-logout)
  useEffect(() => {
    const sessionId = document.cookie.split('; ').find(c => c.startsWith('admin_session_id='))?.split('=')[1]
    if (!sessionId) return

    let failStrikes = 0
    const MAX_STRIKES = 3   // tolerate 3 consecutive failures before logout

    const checkRevoked = async () => {
      try {
        const res = await fetch(`/api/admin/session-check?sid=${encodeURIComponent(sessionId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!data.valid) {
            failStrikes++
            if (failStrikes >= MAX_STRIKES) {
              // Session truly revoked — force logout
              document.cookie = 'portfolio_admin_session=; Max-Age=0; path=/'
              router.replace('/admin/login?reason=revoked')
            }
          } else {
            failStrikes = 0  // reset on success
          }
        }
        // If res is not ok (network hiccup), don't increment strikes
      } catch {
        // Network error — don't log out, wait for recovery
      }
    }

    const heartbeat = setInterval(async () => {
      await checkRevoked()
      // Update last_active
      fetch('/api/admin/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId }),
      }).catch(() => {})
    }, 30000) // every 30s (was 10s — less aggressive on mobile)

    // Check on mount
    checkRevoked()
    return () => clearInterval(heartbeat)
  }, [])

  const handleMessagesViewed = () => {
    fetch('/api/contact?type=summary').then(r => r.json()).then(d => {
      const total = d.data?.total ?? 0
      localStorage.setItem('_seen_msg_count', String(total))
      setUnreadMsgCount(0)
    }).catch(() => {})
  }

  useEffect(() => {
    // Load from DB (cross-device sync)
    fetch('/api/portfolio', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json) setData(d => ({
          ...d,
          ...json,
          // Deep-merge hero so nested fields always get defaults
          hero: { ...d.hero, ...(json.hero || {}) },
          about: { ...d.about, ...(json.about || {}) },
        }))
      })
      .catch(() => {})
  }, [])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  // Poll for pending live chat requests — runs globally so the sidebar badge
  // and notification toast show up even when the admin isn't on the Live Chat tab.
  useEffect(() => {
    const seenPendingIds = new Set<string>()
    let firstRun = true
    const fetchLiveChats = async () => {
      try {
        const r = await fetch('/api/live-chat?admin=1')
        if (r.ok) {
          const d = await r.json()
          const chatList: any[] = d.chats || []
          const pending = chatList.filter((c: any) => c.status === 'pending')
          setPendingLiveChatCount(pending.length)
          if (!firstRun) {
            for (const c of pending) {
              if (!seenPendingIds.has(c.id)) {
                addToast(`💬 New live chat from ${c.user_name || 'a visitor'}`, 'success')
              }
            }
          }
          seenPendingIds.clear()
          for (const c of pending) seenPendingIds.add(c.id)
          firstRun = false
        }
      } catch {}
    }
    fetchLiveChats()
    const interval = setInterval(fetchLiveChats, 8000)
    return () => clearInterval(interval)
  }, [addToast])

  const handleSave = async (section: keyof PortfolioData, newData: PortfolioData[keyof PortfolioData]) => {
    if (coAdminInfo && !canEdit(section as Section)) {
      addToast("You don't have permission to edit this section.", 'error')
      return
    }
    setSaving(true)
    try {
      const updated = { ...data, [section]: newData }
      // Save to DB so ALL devices see updates immediately
      await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setData(updated)
      addToast(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`)
      logCoAdminActivity('edit', section as string)
    } catch {
      addToast('Save failed. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    if (coAdminInfo) await fetch('/api/admin/co-admin-session', { method: 'DELETE' }).catch(() => {})
    router.push('/admin/login')
  }

  const totalProjects = data.projects.length
  const totalSkills = data.skills.reduce((a, c) => a + c.skills.length, 0)
  const totalExp = data.experience.length + data.education.length

  return (
    <div className="h-screen bg-[#020817] dark:bg-[#020817] admin-panel text-white flex overflow-hidden" style={{
      backgroundColor: 'var(--admin-bg, #020817)',
      color: 'var(--admin-text, white)'
    }}>
      {/* ── Mobile backdrop overlay — closes sidebar on tap ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="w-64 h-screen bg-slate-900 border-r border-slate-700/40 flex flex-col fixed lg:sticky lg:top-0 z-30 overflow-hidden">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-slate-700/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">Portfolio CMS</p>
                  <p className="text-xs text-slate-500">Admin Dashboard</p>
                </div>
                {/* Close button — mobile only */}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.filter(item => item.id !== 'co_admins' || !coAdminInfo).map((item) => {
                const Icon = item.icon
                const active = activeSection === item.id
                const locked = coAdminInfo && SECTION_PERMISSION_MAP[item.id] && !canEdit(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigateSection(item.id)
                      // Auto-close on mobile after selecting a section
                      if (isMobile()) setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-blue-400 border border-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : ''}`} />
                    {item.label}
                    {locked && <Lock className="w-3 h-3 text-slate-500 ml-auto" title="View only — no edit permission" />}
                    {item.id === 'messages' && unreadMsgCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                      </span>
                    )}
                    {item.id === 'security' && suspiciousCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {suspiciousCount > 9 ? '9+' : suspiciousCount}
                      </span>
                    )}
                    {item.id === 'live_chat' && pendingLiveChatCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {pendingLiveChatCount > 9 ? '9+' : pendingLiveChatCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Bottom */}
            <div className="px-3 py-4 border-t border-slate-700/40 space-y-2">
              {coAdminInfo && (
                <div className="px-3 py-2 rounded-xl bg-violet-600/10 border border-violet-500/20 text-xs text-violet-300 mb-1">
                  🔑 Co-Admin: <strong>{coAdminInfo.name}</strong> ({coAdminInfo.relation})
                </div>
              )}
              <a
                href="/"
                target="_blank"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
              >
                <Eye className="w-4 h-4" />
                View Portfolio
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-slate-900/60 border-b border-slate-700/40 flex items-center px-4 gap-4 sticky top-0 z-20 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white flex-shrink-0"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen
              ? <X className="w-5 h-5" />
              : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )
            }
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-white capitalize truncate">
              {navItems.find((n) => n.id === activeSection)?.label ?? 'Dashboard'}
            </h1>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </div>
          )}

        </header>

        {/* Page */}
        <main data-scroll-lock-target className="flex-1 overflow-y-auto p-6 relative">
          {coAdminInfo && SECTION_PERMISSION_MAP[activeSection] && !canEdit(activeSection) && (
            <div className="mb-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm rounded-xl px-4 py-3">
              <Lock className="w-4 h-4 flex-shrink-0" />
              View only — you don't have permission to edit this section. Everything below is locked.
            </div>
          )}
          <div className={coAdminInfo && SECTION_PERMISSION_MAP[activeSection] && !canEdit(activeSection) ? 'pointer-events-none opacity-70 select-none' : ''}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {activeSection === 'overview' && <OverviewSection data={data} totalProjects={totalProjects} totalSkills={totalSkills} totalExp={totalExp} setActiveSection={navigateSection} suspiciousCount={suspiciousCount} displayName={coAdminInfo ? coAdminInfo.name : 'Abhishek Singh'} />}
              {activeSection === 'hero' && <HeroSection data={data.hero} onSave={(d) => handleSave('hero', d)} />}
              {activeSection === 'about' && (
                <div className="space-y-6">
                  <AboutSection data={data.about} onSave={(d) => handleSave('about', d)} />
                  <MeasurableImpactSection data={data} onSave={(d) => {
                    const updated = { ...data, measurableImpact: d.measurableImpact }
                    fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
                      .then(() => { addToast('Impact metrics saved!'); window.dispatchEvent(new CustomEvent('portfolio-data-updated')) })
                      .catch(() => addToast('Failed to save', 'error'))
                  }} />
                </div>
              )}
              {activeSection === 'skills' && (
                <div className="space-y-6">
                  <SkillsSection data={data.skills} onSave={(d) => handleSave('skills', d)} />
                  <SkillDetailsSection data={data} onSave={(d) => {
                    const updated = { ...data, skillDetails: d.skillDetails }
                    fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
                      .then(() => { addToast('Skill details saved!'); window.dispatchEvent(new CustomEvent('portfolio-data-updated')) })
                      .catch(() => addToast('Failed to save', 'error'))
                  }} />
                </div>
              )}
              {activeSection === 'experience' && <ExperienceSection data={data.experience} onSave={(d) => handleSave('experience', d)} />}
              {activeSection === 'education' && <EducationSection data={data.education} onSave={(d) => handleSave('education', d)} />}
              {activeSection === 'projects' && <ProjectsSection data={data.projects} onSave={(d) => handleSave('projects', d)} />}
              {activeSection === 'certifications' && <CertificationsSection data={data} onSave={(certs: any) => handleSave('certifications', certs)} addToast={addToast} />}
              {activeSection === 'journey' && <JourneySection addToast={addToast} />}
              {activeSection === 'languages_admin' && (
                <SectionCard title="Languages Manager" icon={Globe}>
                  <LanguagesManager />
                </SectionCard>
              )}
              {activeSection === 'messages' && <MessagesSection onView={handleMessagesViewed} />}
              {activeSection === 'chatbot' && <ChatbotSection addToast={addToast} />}
              {activeSection === 'ai_conversations' && <AIConversationsSection />}
              {activeSection === 'legal' && <LegalSection addToast={addToast} />}
              {activeSection === 'live_chat' && <LiveChatSection />}
              {activeSection === 'settings' && <SettingsSection addToast={addToast} />}
              {activeSection === 'security' && <SecuritySection />}
              {activeSection === 'github_settings' && <GithubSettingsSection addToast={addToast} />}
              {activeSection === 'portfolio_blogs' && <PortfolioBlogsSection addToast={addToast} />}
              {activeSection === 'testimonials_admin' && <TestimonialsAdminSection addToast={addToast} />}
              {activeSection === 'meetings' && <MeetingsAdminSectionV2 addToast={addToast} />}
              {activeSection === 'reminders' && <RemindersSection addToast={addToast} />}
              {activeSection === 'project_media' && <ProjectMediaSection addToast={addToast} />}
              {activeSection === 'chatbot_abuse' && <ChatbotAbuseSection addToast={addToast} />}
              {activeSection === 'version' && <VersionSection addToast={addToast} />}
              {activeSection === 'sitemap_admin' && <SitemapAdminSection />}
              {activeSection === 'co_admins' && !coAdminInfo && <CoAdminsSection addToast={addToast} />}
            </motion.div>
          </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Toast notifications ── */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-auto ${
                t.type === 'success'
                  ? 'bg-emerald-900/90 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-900/90 border border-red-500/30 text-red-300'
              }`}
            >
              {t.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Overview Section ─────────────────────────────────────────────────────────
function OverviewSection({
  data, totalProjects, totalSkills, totalExp, setActiveSection, suspiciousCount, displayName,
}: {
  data: PortfolioData
  totalProjects: number
  totalSkills: number
  totalExp: number
  setActiveSection: (s: Section) => void
  suspiciousCount: number
  displayName: string
}) {
  const stats = [
    { label: 'Projects', value: totalProjects, icon: FolderGit2, section: 'projects' as Section, color: 'from-blue-600 to-cyan-500' },
    { label: 'Skill Items', value: totalSkills, icon: Code2, section: 'skills' as Section, color: 'from-purple-600 to-pink-500' },
    { label: 'Timeline Entries', value: totalExp, icon: Briefcase, section: 'experience' as Section, color: 'from-orange-600 to-red-500' },
    { label: 'Skill Categories', value: data.skills.length, icon: Settings, section: 'skills' as Section, color: 'from-green-600 to-teal-500' },
  ]

  // ── Live clock ────────────────────────────────────────────────────────────
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })

  // ── Maintenance mode ──────────────────────────────────────────────────────
  const [maintenance, setMaintenance] = useState(false)
  const [maintMsg, setMaintMsg] = useState("We're upgrading things. Back soon! 🚀")
  const [maintLoading, setMaintLoading] = useState(true)
  const [maintSaving, setMaintSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        setMaintenance(d.settings?.maintenance_mode === 'true')
        if (d.settings?.maintenance_message) setMaintMsg(d.settings.maintenance_message)
      })
      .catch(() => {})
      .finally(() => setMaintLoading(false))
  }, [])

  const toggleMaintenance = async (next: boolean) => {
    setMaintSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenance_mode: String(next),
          maintenance_message: maintMsg,
        }),
      })
      if (res.ok) setMaintenance(next)
    } catch {
      // Keep current state on failure
    } finally {
      setMaintSaving(false)
    }
  }

  const saveMaintMsg = async () => {
    setMaintSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance_message: maintMsg }),
      })
    } catch {} finally { setMaintSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Welcome back, {displayName} 👋</h2>
          <p className="text-slate-400 text-sm">Manage and update your portfolio content from here.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Live clock */}
          <div className="flex flex-col items-end bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-2.5">
            <span className="text-xs text-slate-500 font-medium">{dateStr}</span>
            <span className="text-lg font-bold text-white tabular-nums">{timeStr}</span>
          </div>
          {suspiciousCount > 0 && (
            <button
              onClick={() => setActiveSection('security')}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" />
              {suspiciousCount} Security Alert{suspiciousCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* ── Maintenance Mode Card ─────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 transition-all duration-300 ${
        maintenance
          ? 'bg-amber-500/10 border-amber-500/40'
          : 'bg-slate-900/60 border-slate-700/40'
      }`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-colors ${maintenance ? 'bg-amber-500/20' : 'bg-slate-800'}`}>
              {maintenance ? <WifiOff className="w-5 h-5 text-amber-400" /> : <Wifi className="w-5 h-5 text-green-400" />}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Maintenance Mode</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {maintLoading
                  ? 'Loading…'
                  : maintenance
                    ? '🔴 Site is hidden from visitors — they see the maintenance page'
                    : '🟢 Site is live — visitors can access your portfolio normally'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => !maintLoading && !maintSaving && toggleMaintenance(!maintenance)}
            disabled={maintLoading || maintSaving}
            className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 ${
              maintenance
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
            }`}
          >
            {maintSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {/* Pill switch */}
            <span className={`inline-flex w-10 h-5 rounded-full transition-colors ${maintenance ? 'bg-amber-500' : 'bg-slate-600'}`}>
              <span className={`my-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${maintenance ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
            {maintenance ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>

        {/* Custom message editor */}
        <div className="mt-4 space-y-2">
          <label className="text-xs text-slate-400 font-medium">Visitor message shown during maintenance</label>
          <div className="flex gap-2">
            <input
              value={maintMsg}
              onChange={e => setMaintMsg(e.target.value)}
              placeholder="We're upgrading things. Back soon! 🚀"
              className="flex-1 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-all"
            />
            <button
              onClick={saveMaintMsg}
              disabled={maintSaving}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-300 hover:text-white transition-all disabled:opacity-50 flex-shrink-0"
            >
              {maintSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            ⚡ Changes take effect within ~5 seconds — no refresh needed for visitors.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.label}
              onClick={() => setActiveSection(s.section)}
              className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 text-left hover:border-slate-600/60 transition-all group"
            >
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </button>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Quick Edit</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {navItems.filter(n => n.id !== 'overview').map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 hover:border-blue-500/30 rounded-xl text-sm text-slate-300 hover:text-white transition-all"
              >
                <Icon className="w-4 h-4 text-blue-400" />
                Edit {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">How it works</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Changes are saved to your browser&apos;s local storage and reflected on the portfolio instantly. To persist changes across devices, export the data or integrate a database. Use the <strong className="text-slate-300">env vars</strong> <code className="font-mono text-blue-300">ADMIN_USERNAME</code> and <code className="font-mono text-blue-300">ADMIN_PASSWORD</code> to set custom credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ data, onSave }: { data: PortfolioData['hero']; onSave: (d: PortfolioData['hero']) => void }) {
  const [form, setForm] = useState(data)
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  // Sync form from DB data only once (when data first arrives from the server).
  // We must NOT re-run this on every data change or it wipes the user's in-progress edits.
  const initialised = useRef(false)
  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true
      setForm(data)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resume upload state ────────────────────────────────────────────────────
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeStatus, setResumeStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setResumeStatus({ type: 'error', msg: 'Only PDF files are supported.' })
      return
    }
    setResumeUploading(true)
    setResumeStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/resume', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed')
      setForm((f) => ({ ...f, resumeUrl: json.url }))
      setResumeStatus({ type: 'success', msg: 'Resume uploaded! Click "Save Hero" to apply.' })
    } catch (err: unknown) {
      setResumeStatus({ type: 'error', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setResumeUploading(false)
      if (resumeInputRef.current) resumeInputRef.current.value = ''
    }
  }

  return (
    <SectionCard title="Hero Section" icon={Home}>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <Label>Full Name</Label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <Label>Title / Role</Label>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Full Stack Engineer" />
        </div>
        <div className="md:col-span-2">
          <Label>Subtitle</Label>
          <Input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Short tagline" />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Longer bio paragraph" />
        </div>
        {/* ── Profile Bar Fields (shown under name in hero) ─────────────── */}
        <div className="md:col-span-2 mt-1 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-4">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2">Profile Bar (shown under your name)</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Current Job / Role</Label>
              <Input value={(form as any).currentJob ?? ''} onChange={(e) => set('currentJob' as any, e.target.value)} placeholder="e.g. Amazon Intern" />
            </div>
            <div>
              <Label>Current Company</Label>
              <Input value={(form as any).currentJobCompany ?? ''} onChange={(e) => set('currentJobCompany' as any, e.target.value)} placeholder="e.g. Amazon Development Center India" />
            </div>
            <div>
              <Label>Education (University / College)</Label>
              <Input value={(form as any).education ?? ''} onChange={(e) => set('education' as any, e.target.value)} placeholder="e.g. J.C. Bose University" />
            </div>
            <div>
              <Label>Education Degree</Label>
              <Input value={(form as any).educationDegree ?? ''} onChange={(e) => set('educationDegree' as any, e.target.value)} placeholder="e.g. B.Tech CSE" />
            </div>
            <div className="md:col-span-2">
              <Label>Current City (shown in profile bar)</Label>
              <Input value={(form as any).currentLocation ?? ''} onChange={(e) => set('currentLocation' as any, e.target.value)} placeholder="e.g. New Delhi, India" />
              <p className="text-xs text-slate-500 mt-1">This is the city shown next to your name in the hero section.</p>
            </div>
          </div>
        </div>

        <div>
          <Label>GitHub URL</Label>
          <Input value={form.github} onChange={(e) => set('github', e.target.value)} placeholder="https://github.com/..." />
        </div>
        <div>
          <Label>LinkedIn URL</Label>
          <Input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label>Instagram URL</Label>
          <Input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/..." />
        </div>
        <div>
          <Label>Facebook URL</Label>
          <Input value={form.facebook ?? ''} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/..." />
        </div>
        <div>
          <Label>LeetCode URL</Label>
          <Input value={form.leetcode ?? ''} onChange={(e) => set('leetcode', e.target.value)} placeholder="https://leetcode.com/u/..." />
        </div>
        <div className="md:col-span-2">
          <Label>Current Location (shown in Get In Touch)</Label>
          <LocationPicker
            country={form.locationCountry || ''}
            state={form.locationState || ''}
            city={form.locationCity || ''}
            onChange={(field, val) => {
              if (field === 'country') { set('locationCountry', val); set('locationState', ''); set('locationCity', '') }
              else if (field === 'state') { set('locationState', val); set('locationCity', '') }
              else set('locationCity', val)
              // Build display string
              const c = field === 'country' ? val : form.locationCountry || ''
              const s = field === 'state' ? val : (field === 'country' ? '' : form.locationState || '')
              const ci = field === 'city' ? val : (field !== 'country' && field !== 'state' ? form.locationCity || '' : '')
              const parts = [ci, s, c].filter(Boolean)
              set('location', parts.join(', '))
            }}
          />
          {form.location && (
            <p className="mt-1.5 text-xs text-slate-400">📍 Will show as: <span className="text-blue-400">{form.location}</span></p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('available', !form.available)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.available ? 'bg-green-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.available ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-slate-300">Show "Available for opportunities" badge</span>
          </label>
        </div>
      </div>

      {/* ── Resume Management ─────────────────────────────────────────────── */}
      <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">Resume / CV</span>
        </div>

        {/* Current URL display */}
        <div>
          <Label>Current Resume URL</Label>
          <div className="flex gap-2">
            <Input
              value={form.resumeUrl || '/Cv.pdf'}
              onChange={(e) => set('resumeUrl', e.target.value)}
              placeholder="https://... or /Cv.pdf"
              className="flex-1 font-mono text-xs"
            />
            {form.resumeUrl && (
              <a
                href={form.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </a>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            You can paste any public PDF URL here, or upload a new file below.
          </p>
        </div>

        {/* File upload */}
        <div>
          <Label>Upload New Resume (PDF only)</Label>
          <div
            onClick={() => !resumeUploading && resumeInputRef.current?.click()}
            className={`mt-1.5 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
              ${resumeUploading ? 'opacity-50 cursor-not-allowed border-slate-600' : 'border-slate-600 hover:border-blue-500 hover:bg-blue-500/5'}`}
          >
            {resumeUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="text-sm text-slate-400">Uploading…</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-slate-500" />
                <span className="text-sm text-slate-400">Click to select a PDF file</span>
                <span className="text-xs text-slate-600">Max recommended size: 5 MB</span>
              </>
            )}
            <input
              ref={resumeInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleResumeUpload}
            />
          </div>
        </div>

        {/* Status feedback */}
        {resumeStatus && (
          <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm
            ${resumeStatus.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {resumeStatus.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {resumeStatus.msg}
          </div>
        )}
      </div>

      {/* ATS Score Widget */}
      <ATSScoreWidget />

      <SaveButton onClick={() => onSave(form)} />
    </SectionCard>
  )
}

// ─── About Section ────────────────────────────────────────────────────────────
function AboutSection({ data, onSave }: { data: PortfolioData['about']; onSave: (d: PortfolioData['about']) => void }) {
  const [form, setForm] = useState(data)

  const updateStat = (i: number, key: 'label' | 'value', val: string) => {
    const stats = [...form.stats]
    stats[i] = { ...stats[i], [key]: val }
    setForm((f) => ({ ...f, stats }))
  }

  const addStat = () => setForm((f) => ({ ...f, stats: [...f.stats, { label: 'New Stat', value: '0' }] }))
  const removeStat = (i: number) => setForm((f) => ({ ...f, stats: f.stats.filter((_, idx) => idx !== i) }))

  return (
    <SectionCard title="About Section" icon={User}>
      <div className="space-y-4">
        <div>
          <Label>Bio Paragraph 1</Label>
          <Textarea rows={3} value={form.bio1} onChange={(e) => setForm((f) => ({ ...f, bio1: e.target.value }))} />
        </div>
        <div>
          <Label>Bio Paragraph 2</Label>
          <Textarea rows={3} value={form.bio2} onChange={(e) => setForm((f) => ({ ...f, bio2: e.target.value }))} />
        </div>
        <div>
          <Label>Bio Paragraph 3</Label>
          <Textarea rows={3} value={form.bio3} onChange={(e) => setForm((f) => ({ ...f, bio3: e.target.value }))} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Stats / Numbers</Label>
            <button onClick={addStat} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Stat
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.stats.map((stat, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Stat #{i + 1}</span>
                  <button onClick={() => removeStat(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Input placeholder="Value (e.g. 15+)" value={stat.value} onChange={(e) => updateStat(i, 'value', e.target.value)} />
                <Input placeholder="Label (e.g. Projects)" value={stat.label} onChange={(e) => updateStat(i, 'label', e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <SaveButton onClick={() => onSave(form)} />
    </SectionCard>
  )
}

// ─── Measurable Impact Section ────────────────────────────────────────────────
function MeasurableImpactSection({ data, onSave }: { data: any; onSave: (d: any) => void }) {
  const [items, setItems] = useState<Array<{ metric: string; label: string }>>(
    data.measurableImpact ?? []
  )
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/portfolio', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setItems(json.measurableImpact ?? [])
      }
    } finally {
      setRefreshing(false)
    }
  }

  const updateItem = (i: number, key: 'metric' | 'label', val: string) => {
    const next = [...items]
    next[i] = { ...next[i], [key]: val }
    setItems(next)
  }

  const addItem = () => setItems(prev => [...prev, { metric: '0%', label: 'New impact metric' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  return (
    <SectionCard title="Measurable Impact" icon={BarChart2}>
      <div className="mb-4 flex items-center gap-3">
        <p className="text-slate-400 text-sm flex-1">These metrics show in the About section. Click Refresh to pull latest saved data.</p>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Fetching…' : 'Refresh'}
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 flex gap-3 items-start">
            <div className="flex-shrink-0 w-24">
              <Label>Metric</Label>
              <Input value={item.metric} onChange={e => updateItem(i, 'metric', e.target.value)} placeholder="e.g. 35%" />
            </div>
            <div className="flex-1">
              <Label>Description</Label>
              <Input value={item.label} onChange={e => updateItem(i, 'label', e.target.value)} placeholder="e.g. Rendering efficiency boost" />
            </div>
            <button onClick={() => removeItem(i)} className="mt-6 text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-600 hover:border-emerald-500/50 rounded-xl text-sm text-slate-400 hover:text-emerald-400 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Impact Metric
        </button>
      </div>
      <SaveButton onClick={() => onSave({ ...data, measurableImpact: items })} />
    </SectionCard>
  )
}

// ─── Skills Section ───────────────────────────────────────────────────────────
function SkillsSection({ data, onSave }: { data: PortfolioData['skills']; onSave: (d: PortfolioData['skills']) => void }) {
  const [cats, setCats] = useState(data)
  const [expanded, setExpanded] = useState<number | null>(0)

  const updateField = (i: number, key: 'title' | 'color', val: string) =>
    setCats((c) => c.map((cat, idx) => idx === i ? { ...cat, [key]: val } : cat))

  const updateSkill = (ci: number, si: number, val: string) =>
    setCats((c) => c.map((cat, idx) => idx === ci ? { ...cat, skills: cat.skills.map((s, j) => j === si ? val : s) } : cat))

  const addSkill = (ci: number) =>
    setCats((c) => c.map((cat, idx) => idx === ci ? { ...cat, skills: [...cat.skills, 'New Skill'] } : cat))

  const removeSkill = (ci: number, si: number) =>
    setCats((c) => c.map((cat, idx) => idx === ci ? { ...cat, skills: cat.skills.filter((_, j) => j !== si) } : cat))

  const addCategory = () =>
    setCats((c) => [...c, { title: 'New Category', icon: 'Code2', skills: ['Skill 1'], color: 'from-blue-600 to-cyan-500' }])

  const removeCategory = (i: number) => setCats((c) => c.filter((_, idx) => idx !== i))

  return (
    <SectionCard title="Skills & Expertise" icon={Code2}>
      <div className="space-y-3">
        {cats.map((cat, ci) => (
          <div key={ci} className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === ci ? null : ci)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex-1 font-medium text-sm text-white">{cat.title || 'Unnamed Category'}</span>
              <span className="text-xs text-slate-500 mr-2">{cat.skills.length} skills</span>
              {expanded === ci ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            <AnimatePresence>
              {expanded === ci && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-700/40 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Category Title</Label>
                        <Input value={cat.title} onChange={(e) => updateField(ci, 'title', e.target.value)} />
                      </div>
                      <div>
                        <Label>Gradient Color (Tailwind)</Label>
                        <Input value={cat.color} onChange={(e) => updateField(ci, 'color', e.target.value)} placeholder="from-blue-600 to-cyan-500" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Skills</Label>
                        <button onClick={() => addSkill(ci)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {cat.skills.map((skill, si) => (
                          <div key={si} className="flex gap-2">
                            <Input value={skill} onChange={(e) => updateSkill(ci, si, e.target.value)} />
                            <button onClick={() => removeSkill(ci, si)} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => removeCategory(ci)}
                      className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors pt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove this category
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        <button
          onClick={addCategory}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-600 hover:border-blue-500/50 rounded-xl text-sm text-slate-400 hover:text-blue-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Skill Category
        </button>
      </div>
      <SaveButton onClick={() => onSave(cats)} />
    </SectionCard>
  )
}

// ─── Skill Details Section ────────────────────────────────────────────────────
function SkillDetailsSection({ data, onSave }: { data: any; onSave: (d: any) => void }) {
  const [details, setDetails] = useState<Record<string, { level: number; lastUsed: string; note: string }>>(
    data.skillDetails ?? {}
  )
  const [newSkillName, setNewSkillName] = useState('')

  const allSkillNames = Array.from(new Set([
    ...Object.keys(details),
    ...(data.skills ?? []).flatMap((cat: any) => cat.skills as string[]),
  ])).sort()

  const updateDetail = (skill: string, key: 'level' | 'lastUsed' | 'note', val: string | number) => {
    setDetails(prev => ({ ...prev, [skill]: { ...(prev[skill] ?? { level: 75, lastUsed: 'Recently', note: '' }), [key]: val } }))
  }

  const addSkill = () => {
    const name = newSkillName.trim()
    if (!name) return
    setDetails(prev => ({ ...prev, [name]: { level: 75, lastUsed: 'Recently', note: '' } }))
    setNewSkillName('')
  }

  const removeDetail = (skill: string) => {
    setDetails(prev => { const next = { ...prev }; delete next[skill]; return next })
  }

  return (
    <SectionCard title="Skill Confidence & Details" icon={BarChart2}>
      <p className="text-slate-400 text-sm mb-4">Set confidence %, last used date, and a context note for each skill. These show when a user clicks a skill on the portfolio.</p>
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {allSkillNames.map(skill => {
          const d = details[skill] ?? { level: 75, lastUsed: 'Recently', note: '' }
          return (
            <div key={skill} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{skill}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d.level >= 90 ? 'text-emerald-400 bg-emerald-500/10' : d.level >= 75 ? 'text-blue-400 bg-blue-500/10' : 'text-orange-400 bg-orange-500/10'}`}>
                    {d.level >= 90 ? 'Expert' : d.level >= 75 ? 'Mid' : 'Learning'}
                  </span>
                  <button onClick={() => removeDetail(skill)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Confidence % ({d.level})</Label>
                  <input
                    type="range" min={0} max={100} value={d.level}
                    onChange={e => updateDetail(skill, 'level', parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div>
                  <Label>Last Used</Label>
                  <Input value={d.lastUsed} onChange={e => updateDetail(skill, 'lastUsed', e.target.value)} placeholder="e.g. This month" />
                </div>
              </div>
              <div>
                <Label>Context Note</Label>
                <Input value={d.note} onChange={e => updateDetail(skill, 'note', e.target.value)} placeholder="Brief context about how you use this skill" />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 mt-4">
        <Input value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="Add a skill name manually…" onKeyDown={e => e.key === 'Enter' && addSkill()} />
        <button onClick={addSkill} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 whitespace-nowrap">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <SaveButton onClick={() => onSave({ ...data, skillDetails: details })} />
    </SectionCard>
  )
}

// ─── Portfolio Certifications Section ─────────────────────────────────────────
type PortfolioCert = {
  id: string; name: string; issuer: string; date: string;
  credentialUrl: string; credentialPdfUrl: string; badgeColor: string; skills: string[]; expiry: string;
}

const BADGE_COLORS = [
  'from-blue-600 to-cyan-500',
  'from-purple-600 to-pink-500',
  'from-green-600 to-teal-500',
  'from-yellow-500 to-orange-500',
  'from-sky-600 to-blue-500',
  'from-indigo-600 to-blue-500',
  'from-red-600 to-pink-500',
]

function CertificationsSection({ data, onSave, addToast }: { data: any; onSave: (d: any) => void; addToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [certs, setCerts] = useState<PortfolioCert[]>(data.certifications ?? [])
  const [editing, setEditing] = useState<PortfolioCert | null>(null)
  const [creating, setCreating] = useState(false)

  const emptyForm: PortfolioCert = {
    id: '', name: '', issuer: '', date: '', credentialUrl: '', credentialPdfUrl: '',
    badgeColor: 'from-blue-600 to-cyan-500', skills: [], expiry: '',
  }

  const save = (cert: PortfolioCert) => {
    if (!cert.name.trim()) { addToast('Certificate name is required', 'error'); return }
    const next = cert.id
      ? certs.map(c => c.id === cert.id ? cert : c)
      : [...certs, { ...cert, id: `cert_${Date.now()}` }]
    setCerts(next)
    onSave(next)
    setEditing(null)
    setCreating(false)
  }

  const remove = (id: string) => {
    const next = certs.filter(c => c.id !== id)
    setCerts(next)
    onSave(next)
    addToast('Certification removed')
  }

  if (editing || creating) {
    const cert = editing ?? emptyForm
    return <PortfolioCertEditor cert={cert} onSave={save} onCancel={() => { setEditing(null); setCreating(false) }} />
  }

  return (
    <SectionCard title="Certifications & Courses" icon={Award}>
      <p className="text-slate-400 text-sm mb-4">Manage portfolio certifications. Each cert can have a PDF link that opens directly for the visitor.</p>
      <div className="space-y-3">
        {certs.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-6">No certifications added yet.</p>
        )}
        {certs.map(cert => (
          <div key={cert.id} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${cert.badgeColor} text-white flex-shrink-0`}>
              <Award className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-white truncate">{cert.name}</p>
              <p className="text-xs text-slate-400">{cert.issuer} · {cert.date}</p>
              {cert.credentialPdfUrl && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-1">
                  <FileText className="w-3 h-3" /> PDF linked
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setEditing(cert)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(cert.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-600 hover:border-blue-500/50 rounded-xl text-sm text-slate-400 hover:text-blue-400 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Certification
        </button>
      </div>
    </SectionCard>
  )
}

function PortfolioCertEditor({ cert, onSave, onCancel }: { cert: PortfolioCert; onSave: (c: PortfolioCert) => void; onCancel: () => void }) {
  const [form, setForm] = useState<PortfolioCert>(cert)
  const [skillInput, setSkillInput] = useState('')

  const setField = (k: keyof PortfolioCert, v: any) => setForm(f => ({ ...f, [k]: v }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s)) setField('skills', [...form.skills, s])
    setSkillInput('')
  }

  const removeSkill = (s: string) => setField('skills', form.skills.filter(x => x !== s))

  return (
    <SectionCard title={cert.id ? 'Edit Certification' : 'Add Certification'} icon={Award}>
      <div className="space-y-4">
        <div>
          <Label>Certificate Name *</Label>
          <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. React – The Complete Guide" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Issuer / Platform</Label>
            <Input value={form.issuer} onChange={e => setField('issuer', e.target.value)} placeholder="e.g. Udemy, freeCodeCamp" />
          </div>
          <div>
            <Label>Date</Label>
            <Input value={form.date} onChange={e => setField('date', e.target.value)} placeholder="e.g. 2024" />
          </div>
        </div>
        <div>
          <Label>Certificate PDF URL (direct link to PDF)</Label>
          <Input value={form.credentialPdfUrl} onChange={e => setField('credentialPdfUrl', e.target.value)} placeholder="https://... or /path/to/cert.pdf" />
          <p className="text-xs text-slate-500 mt-1">Visitors will see a "View Certificate" button that opens this URL directly.</p>
        </div>
        <div>
          <Label>External Credential URL (optional)</Label>
          <Input value={form.credentialUrl} onChange={e => setField('credentialUrl', e.target.value)} placeholder="https://udemy.com/certificate/..." />
        </div>
        <div>
          <Label>Expiry Date (optional)</Label>
          <Input value={form.expiry} onChange={e => setField('expiry', e.target.value)} placeholder="e.g. Dec 2026" />
        </div>
        <div>
          <Label>Badge Color</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {BADGE_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setField('badgeColor', color)}
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} border-2 transition-all ${form.badgeColor === color ? 'border-white scale-110' : 'border-transparent'}`}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Skills Covered</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.skills.map(s => (
              <span key={s} className="flex items-center gap-1 text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded-full">
                {s}
                <button onClick={() => removeSkill(s)} className="text-slate-400 hover:text-red-400"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add a skill…" onKeyDown={e => e.key === 'Enter' && addSkill()} />
            <button onClick={addSkill} className="px-3 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:text-blue-300">Add</button>
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={() => onSave(form)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Save className="w-4 h-4" /> Save Certificate
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white bg-slate-700 rounded-lg text-sm transition-colors">Cancel</button>
      </div>
    </SectionCard>
  )
}

// ─── Location Picker ──────────────────────────────────────────────────────────
function LocationPicker({ country, state, city, onChange }: {
  country: string; state: string; city: string
  onChange: (field: 'country' | 'state' | 'city', val: string) => void
}) {
  const states = country ? getStates(country) : []
  const cities = country && state ? getCities(country, state) : []

  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label>Country</Label>
        <select
          value={country}
          onChange={e => { onChange('country', e.target.value); onChange('state', ''); onChange('city', '') }}
          className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all"
        >
          <option value="">Select country</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <Label>State / Province</Label>
        <select
          value={state}
          onChange={e => { onChange('state', e.target.value); onChange('city', '') }}
          disabled={!states.length}
          className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all disabled:opacity-40"
        >
          <option value="">Select state</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <Label>City</Label>
        <select
          value={city}
          onChange={e => onChange('city', e.target.value)}
          disabled={!cities.length}
          className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all disabled:opacity-40"
        >
          <option value="">Select city</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── Experience Section ───────────────────────────────────────────────────────
function ExperienceSection({ data, onSave }: { data: PortfolioData['experience']; onSave: (d: PortfolioData['experience']) => void }) {
  const [items, setItems] = useState(data)

  const update = (i: number, key: string, val: string) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  const updateDesc = (i: number, di: number, val: string) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, description: item.description.map((d, j) => j === di ? val : d) } : item))

  const addDesc = (i: number) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, description: [...item.description, ''] } : item))

  const removeDesc = (i: number, di: number) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, description: item.description.filter((_, j) => j !== di) } : item))

  const addItem = () =>
    setItems((arr) => [...arr, { title: 'New Role', company: 'Company Name', period: 'Jan 2025 - Present', type: 'work', description: [''], country: '', state: '', city: '' }])

  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i))

  return (
    <SectionCard title="Work Experience" icon={Briefcase}>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience #{i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Job Title</Label>
                <Input value={item.title} onChange={(e) => update(i, 'title', e.target.value)} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={item.company} onChange={(e) => update(i, 'company', e.target.value)} />
              </div>
              <div>
                <Label>Period</Label>
                <Input value={item.period} onChange={(e) => update(i, 'period', e.target.value)} placeholder="Jan 2024 - Present" />
              </div>
            </div>
            <div>
              <Label>Place</Label>
              <LocationPicker
                country={(item as any).country || ''}
                state={(item as any).state || ''}
                city={(item as any).city || ''}
                onChange={(field, val) => update(i, field, val)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Responsibilities / Achievements</Label>
                <button onClick={() => addDesc(i)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {item.description.map((desc, di) => (
                <div key={di} className="flex gap-2 mb-2">
                  <Textarea rows={2} value={desc} onChange={(e) => updateDesc(i, di, e.target.value)} placeholder="Describe what you did..." />
                  <button onClick={() => removeDesc(i, di)} className="p-2 text-slate-600 hover:text-red-400 transition-colors self-start mt-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-600 hover:border-blue-500/50 rounded-xl text-sm text-slate-400 hover:text-blue-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Experience
        </button>
      </div>
      <SaveButton onClick={() => onSave(items)} />
    </SectionCard>
  )
}

// ─── Education Section ────────────────────────────────────────────────────────
function EducationSection({ data, onSave }: { data: PortfolioData['education']; onSave: (d: PortfolioData['education']) => void }) {
  const [items, setItems] = useState(data)

  const update = (i: number, key: string, val: string) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  const updateAch = (i: number, ai: number, val: string) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, achievements: item.achievements.map((a, j) => j === ai ? val : a) } : item))

  const addAch = (i: number) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, achievements: [...item.achievements, ''] } : item))

  const removeAch = (i: number, ai: number) =>
    setItems((arr) => arr.map((item, idx) => idx === i ? { ...item, achievements: item.achievements.filter((_, j) => j !== ai) } : item))

  const addItem = () =>
    setItems((arr) => [...arr, { title: 'Degree / Course', institution: 'Institution', period: '2024', type: 'education', description: 'Field of study', achievements: [''], country: '', state: '', city: '' }])

  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i))

  return (
    <SectionCard title="Education" icon={GraduationCap}>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Education #{i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Degree / Course Title</Label>
                <Input value={item.title} onChange={(e) => update(i, 'title', e.target.value)} />
              </div>
              <div>
                <Label>Institution</Label>
                <Input value={item.institution} onChange={(e) => update(i, 'institution', e.target.value)} />
              </div>
              <div>
                <Label>Period</Label>
                <Input value={item.period} onChange={(e) => update(i, 'period', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Description / Field</Label>
                <Input value={item.description} onChange={(e) => update(i, 'description', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Place</Label>
              <LocationPicker
                country={(item as any).country || ''}
                state={(item as any).state || ''}
                city={(item as any).city || ''}
                onChange={(field, val) => update(i, field, val)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Achievements / Highlights</Label>
                <button onClick={() => addAch(i)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {item.achievements.map((ach, ai) => (
                <div key={ai} className="flex gap-2 mb-2">
                  <Input value={ach} onChange={(e) => updateAch(i, ai, e.target.value)} placeholder="Achievement..." />
                  <button onClick={() => removeAch(i, ai)} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-600 hover:border-blue-500/50 rounded-xl text-sm text-slate-400 hover:text-blue-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Education
        </button>
      </div>
      <SaveButton onClick={() => onSave(items)} />
    </SectionCard>
  )
}

// ─── Projects Section ─────────────────────────────────────────────────────────
const gradients = [
  'from-blue-600 to-cyan-500',
  'from-orange-600 to-red-500',
  'from-green-600 to-teal-500',
  'from-indigo-600 to-blue-500',
  'from-purple-600 to-pink-500',
  'from-yellow-600 to-orange-500',
]

function ProjectsSection({ data, onSave }: { data: PortfolioData['projects']; onSave: (d: PortfolioData['projects']) => void }) {
  const [items, setItems] = useState(data)

  const update = (i: number, key: string, val: string) =>
    setItems((arr) => arr.map((p, idx) => idx === i ? { ...p, [key]: val } : p))

  const updateTech = (i: number, ti: number, val: string) =>
    setItems((arr) => arr.map((p, idx) => idx === i ? { ...p, tech: p.tech.map((t, j) => j === ti ? val : t) } : p))

  const addTech = (i: number) =>
    setItems((arr) => arr.map((p, idx) => idx === i ? { ...p, tech: [...p.tech, ''] } : p))

  const removeTech = (i: number, ti: number) =>
    setItems((arr) => arr.map((p, idx) => idx === i ? { ...p, tech: p.tech.filter((_, j) => j !== ti) } : p))

  // Features helpers
  const getFeatures = (p: typeof items[0]) => (p as any).features as string[] ?? []

  const updateFeature = (i: number, fi: number, val: string) =>
    setItems(arr => arr.map((p, idx) => idx === i ? { ...p, features: getFeatures(p).map((f: string, j: number) => j === fi ? val : f) } : p))

  const addFeature = (i: number) =>
    setItems(arr => arr.map((p, idx) => idx === i ? { ...p, features: [...getFeatures(p), ''] } : p))

  const removeFeature = (i: number, fi: number) =>
    setItems(arr => arr.map((p, idx) => idx === i ? { ...p, features: getFeatures(p).filter((_: string, j: number) => j !== fi) } : p))

  const addProject = () =>
    setItems((arr: any[]) => [...arr, {
      title: 'New Project', description: 'Project description',
      tech: ['React'], github: '#', live: '#', image: 'from-blue-600 to-cyan-500',
      coverImage: '', features: [], synopsisUrl: '', pptUrl: '', reportUrl: '',
      featured: false, livePreview: { url: '', label: '' },
      caseStudy: { problem: '', solution: '', impact: '', duration: '' },
    }])

  const removeProject = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i))

  return (
    <SectionCard title="Projects" icon={FolderGit2}>
      <div className="space-y-5">
        {items.map((project, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${project.image} flex-shrink-0`} />
              <button onClick={() => removeProject(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Project Title</Label>
                <Input value={project.title} onChange={(e) => update(i, 'title', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={project.description} onChange={(e) => update(i, 'description', e.target.value)} />
              </div>
              <div>
                <Label>GitHub URL</Label>
                <Input value={project.github} onChange={(e) => update(i, 'github', e.target.value)} placeholder="https://github.com/..." />
              </div>
              <div>
                <Label>Live URL</Label>
                <Input value={project.live} onChange={(e) => update(i, 'live', e.target.value)} placeholder="https://..." />
              </div>

              {/* Cover image URL */}
              <div className="col-span-2">
                <Label>Cover Image URL <span className="text-slate-500 font-normal">(optional — overrides gradient)</span></Label>
                <Input value={(project as any).coverImage ?? ''} onChange={(e) => update(i, 'coverImage', e.target.value)} placeholder="https://..." />
              </div>

              {/* Document URLs */}
              <div className="col-span-2 border-t border-slate-700/40 pt-3 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Project Documents</p>
                <div>
                  <Label>Synopsis PDF URL</Label>
                  <Input value={(project as any).synopsisUrl ?? ''} onChange={(e) => update(i, 'synopsisUrl', e.target.value)} placeholder="https://...synopsis.pdf" />
                </div>
                <div>
                  <Label>Presentation (PPTX) URL</Label>
                  <Input value={(project as any).pptUrl ?? ''} onChange={(e) => update(i, 'pptUrl', e.target.value)} placeholder="https://...presentation.pptx" />
                </div>
                <div>
                  <Label>Final Report PDF URL</Label>
                  <Input value={(project as any).reportUrl ?? ''} onChange={(e) => update(i, 'reportUrl', e.target.value)} placeholder="https://...report.pdf" />
                </div>
              </div>
            </div>

            <div>
              <Label>Card Gradient Color</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {gradients.map((g) => (
                  <button
                    key={g}
                    onClick={() => update(i, 'image', g)}
                    title={g}
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g} ${project.image === g ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''} transition-all hover:scale-110`}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Technologies</Label>
                <button onClick={() => addTech(i)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.tech.map((t, ti) => (
                  <div key={ti} className="flex items-center gap-1 bg-slate-700/60 rounded-lg overflow-hidden">
                    <input
                      value={t}
                      onChange={(e) => updateTech(i, ti, e.target.value)}
                      className="bg-transparent text-xs text-white px-2 py-1.5 w-24 focus:outline-none"
                    />
                    <button onClick={() => removeTech(i, ti)} className="pr-2 text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Features editor */}
            <div className="border-t border-slate-700/40 pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label>Key Features <span className="text-slate-500 font-normal">(shown on card &amp; project page)</span></Label>
                <button onClick={() => addFeature(i)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-1.5">
                {getFeatures(project).map((f: string, fi: number) => (
                  <div key={fi} className="flex items-center gap-2">
                    <input value={f} onChange={(e) => updateFeature(i, fi, e.target.value)}
                      placeholder="e.g. 🔐 JWT authentication"
                      className="flex-1 bg-slate-800/60 text-xs text-white px-3 py-2 rounded-lg border border-slate-700/40 focus:outline-none focus:border-blue-500/50" />
                    <button onClick={() => removeFeature(i, fi)} className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {getFeatures(project).length === 0 && (
                  <p className="text-xs text-slate-600 italic">No features added — default features will be shown.</p>
                )}
              </div>
            </div>

            {/* ── Inline Media Manager ── */}
            <InlineProjectMedia
              projectId={(project as any).slug || project.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
              projectTitle={project.title}
            />
          </div>
        ))}

        <button
          onClick={addProject}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-600 hover:border-blue-500/50 rounded-xl text-sm text-slate-400 hover:text-blue-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>
      <SaveButton onClick={() => onSave(items)} />
    </SectionCard>
  )
}

// ─── Inline Project Media (used inside ProjectsSection per-project) ────────────
function InlineProjectMedia({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [open, setOpen] = React.useState(false)
  const [media, setMedia] = React.useState<any[]>([])
  const [count, setCount] = React.useState<number | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/project-media?projectId=${encodeURIComponent(projectId)}`)
      const d = await r.json()
      const sorted = (d.media || []).sort((a: any, b: any) => a.display_order - b.display_order)
      setMedia(sorted)
      setCount(sorted.length)
    } catch {}
  }, [projectId])

  // Load count on mount (collapsed state)
  React.useEffect(() => { load() }, [load])

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    if (!arr.length) return
    setUploading(true)
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      try {
        let mediaType: 'image' | 'gif' | 'video' = 'image'
        if (file.type.startsWith('video/')) mediaType = 'video'
        else if (file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif') mediaType = 'gif'

        // Try Vercel Blob upload first
        const uploadRes = await fetch(`/api/blob-upload?filename=${encodeURIComponent(file.name)}&projectId=${encodeURIComponent(projectId)}`, {
          method: 'POST', body: file,
        })

        let mediaUrl: string
        if (uploadRes.ok) {
          const blobData = await uploadRes.json()
          mediaUrl = blobData.url
        } else {
          // Fallback: base64 data URL (for environments without Blob token)
          mediaUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        }

        await fetch('/api/admin/project-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            media_type: mediaType,
            media_url: mediaUrl,
            title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
            display_order: media.length + i,
          }),
        })
      } catch (e) {
        console.error('Upload failed:', e)
      }
    }
    setUploading(false)
    load()
  }

  const deleteMedia = async (id: string) => {
    if (!confirm('Delete this media item?')) return
    await fetch('/api/admin/project-media', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const saveTitle = async (id: string) => {
    await fetch('/api/admin/project-media', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: editTitle }),
    })
    setEditingId(null)
    load()
  }

  return (
    <div className="border-t border-slate-700/40 pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors w-full"
      >
        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
        <span>Project Media</span>
        {count !== null && count > 0 && (
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">{count}</span>
        )}
        <span className="ml-auto">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${
              dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/40'
            }`}
          >
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.gif" className="hidden" onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files) }} />
            {uploading ? (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Uploading…
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-500" />
                <span className="text-xs text-slate-400">{dragOver ? 'Drop to upload' : 'Drag & drop or click — images, GIFs, videos'}</span>
              </>
            )}
          </div>

          {/* Media grid */}
          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map(item => (
                <div key={item.id} className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-700/40 aspect-video">
                  {item.media_type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Film className="w-5 h-5 text-orange-400" />
                    </div>
                  ) : (
                    <img src={item.thumbnail_url || item.media_url} alt={item.title}
                      className="w-full h-full object-cover select-none"
                      onContextMenu={e => e.preventDefault()} draggable={false} />
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    {editingId === item.id ? (
                      <div className="p-1.5 w-full space-y-1" onClick={e => e.stopPropagation()}>
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          className="w-full text-[10px] bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-white outline-none" />
                        <div className="flex gap-1">
                          <button onClick={() => saveTitle(item.id)} className="flex-1 text-[10px] bg-green-600 text-white rounded py-0.5">Save</button>
                          <button onClick={() => setEditingId(null)} className="flex-1 text-[10px] bg-slate-700 text-white rounded py-0.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(item.id); setEditTitle(item.title) }}
                          className="p-1 rounded bg-white/20 hover:bg-white/30 text-white transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteMedia(item.id)}
                          className="p-1 rounded bg-red-500/30 hover:bg-red-500/50 text-white transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Title badge */}
                  {item.title && editingId !== item.id && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                      <p className="text-[10px] text-white truncate">{item.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Save Button ──────────────────────────────────────────────────────────────
function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-6 flex justify-end">
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
      >
        <Save className="w-4 h-4" />
        Save Changes
      </button>
    </div>
  )
}

// ─── Settings Section ─────────────────────────────────────────────────────────

type ChangeMode = 'username' | 'password' | 'email'

interface SettingsForm {
  mode: ChangeMode
  newUsername: string
  newPassword: string
  confirmPassword: string
  newEmail: string
  adminEmail: string   // where to send OTP
  otp: string
}

type OtpStep = 'idle' | 'sending' | 'sent' | 'verifying' | 'done'

const modeConfig: Record<ChangeMode, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  username: { label: 'Change Username', icon: User,     desc: 'Update your admin login username.' },
  password: { label: 'Change Password', icon: KeyRound, desc: 'Update your admin login password.' },
  email:    { label: 'Change Admin Email', icon: AtSign, desc: 'Update the email where OTP codes are sent.' },
}

// ─── Social Followers Settings ────────────────────────────────────────────────
function SocialFollowersSettings({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [form, setForm] = useState({
    LINKEDIN_FOLLOWERS: '',
    TWITTER_FOLLOWERS: '',
    INSTAGRAM_FOLLOWERS_FALLBACK: '',
    INSTAGRAM_USERNAME: '',
    GITHUB_USERNAME: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [liveData, setLiveData] = useState<Record<string, number | null> | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSocialData = async () => {
    try {
      const res = await fetch('/api/social-followers', { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setLiveData({
          github: d.github || 0,
          instagram: d.instagram || 0,
          linkedin: d.linkedin || 0,
          twitter: d.twitter || 0,
        })
      } else {
        setLiveData({
          github: 0,
          instagram: null,
          linkedin: 0,
          twitter: 0,
        })
      }
    } catch (e) {
      console.error('Failed to fetch social followers:', e)
      setLiveData({
        github: 0,
        instagram: null,
        linkedin: 0,
        twitter: 0,
      })
    }
  }

  useEffect(() => {
    // Load current settings
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const s = d.settings || {}
        setForm({
          LINKEDIN_FOLLOWERS: s.LINKEDIN_FOLLOWERS || '',
          TWITTER_FOLLOWERS: s.TWITTER_FOLLOWERS || '',
          INSTAGRAM_FOLLOWERS_FALLBACK: s.INSTAGRAM_FOLLOWERS_FALLBACK || '',
          INSTAGRAM_USERNAME: s.INSTAGRAM_USERNAME || '_abhiiisheksingh',
          GITHUB_USERNAME: s.GITHUB_USERNAME || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // Fetch live follower counts
    fetchSocialData()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: form }),
      })
      if (res.ok) {
        addToast('Social media settings saved!', 'success')
        // Refresh live data
        fetchSocialData()
      } else {
        addToast('Failed to save settings', 'error')
      }
    } catch {
      addToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchSocialData()
      addToast('Social data refreshed!', 'success')
    } catch (e) {
      addToast('Failed to refresh social data', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Social Media Followers (Live)</h3>
            <p className="text-xs text-slate-500">Real-time follower counts • Auto-updates every 5 minutes</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>
      <div className="p-6 space-y-5">
        {liveData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            {[
              { label: 'GitHub', key: 'github', color: '#a3a3a3', icon: Github },
              { label: 'Instagram', key: 'instagram', color: '#e1306c', icon: Instagram },
              { label: 'LinkedIn', key: 'linkedin', color: '#0077b5', icon: Linkedin },
              { label: 'X / Twitter', key: 'twitter', color: '#1d9bf0', icon: Github },
            ].map(p => {
              const value = (liveData as any)[p.key]
              const isError = value === null
              return (
                <div key={p.key} className={`rounded-xl p-4 text-center border transition-all ${
                  isError 
                    ? 'bg-red-500/10 border-red-500/20' 
                    : 'bg-slate-800/60 border-slate-700/40'
                }`}>
                  <p className="text-xs text-slate-500 mb-2 font-medium">{p.label}</p>
                  {isError ? (
                    <div className="text-center py-2">
                      <p className="text-xs text-red-400 font-semibold">Error</p>
                      <p className="text-[10px] text-red-400/70 mt-0.5">Use fallback</p>
                    </div>
                  ) : (
                    <p className="text-xl font-bold tabular-nums" style={{ color: p.color }}>
                      {(value || 0).toLocaleString()}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {liveData?.instagram === null && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-400 font-semibold mb-1">⚠️ Instagram Live Fetch Restricted</p>
            <p className="text-xs text-amber-400/80">
              Instagram prevents automated follower scraping. Set a fallback count below and it will be used instead.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-400">
          <strong>GitHub:</strong> Fetched automatically from GitHub API  
          <br /><strong>Instagram:</strong> Uses fallback count below (live scraping restricted)  
          <br /><strong>LinkedIn & X/Twitter:</strong> Set manually below  
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">GitHub Username</label>
            <input
              value={form.GITHUB_USERNAME}
              onChange={e => setForm(f => ({ ...f, GITHUB_USERNAME: e.target.value }))}
              placeholder="abhi2506-se"
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Instagram Username</label>
            <input
              value={form.INSTAGRAM_USERNAME}
              onChange={e => setForm(f => ({ ...f, INSTAGRAM_USERNAME: e.target.value }))}
              placeholder="_abhiiisheksingh"
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">📸 Instagram Followers (Fallback)</label>
            <input
              type="number"
              value={form.INSTAGRAM_FOLLOWERS_FALLBACK}
              onChange={e => setForm(f => ({ ...f, INSTAGRAM_FOLLOWERS_FALLBACK: e.target.value }))}
              placeholder="0"
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-500"
            />
            <p className="text-[10px] text-slate-500">Used when live fetch fails</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">LinkedIn Followers</label>
            <input
              type="number"
              value={form.LINKEDIN_FOLLOWERS}
              onChange={e => setForm(f => ({ ...f, LINKEDIN_FOLLOWERS: e.target.value }))}
              placeholder="500"
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">X / Twitter Followers</label>
            <input
              type="number"
              value={form.TWITTER_FOLLOWERS}
              onChange={e => setForm(f => ({ ...f, TWITTER_FOLLOWERS: e.target.value }))}
              placeholder="200"
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-500"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Social Settings</>}
        </button>
      </div>
    </div>
  )
}

// ─── Site Icon Section ────────────────────────────────────────────────────────
function SiteIconSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/favicon', { cache: 'no-store' })
      .then(r => { if (r.redirected) setIconUrl(r.url); else setIconUrl(r.url) })
      .catch(() => {})
  }, [])

  const handleIconUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG, SVG, ICO)')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      // Upload to Vercel Blob via media route
      const id = `favicon_${Date.now().toString(36)}`
      const formData = new FormData()
      formData.append('id', id)
      formData.append('file', file)
      const res = await fetch('/api/journey/media', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json()
      // Save favicon URL to DB
      await fetch('/api/favicon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      setIconUrl(url)
      addToast('Site icon updated! Refresh the page to see it.', 'success')
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden mb-6">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
          <ImageIcon className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-semibold text-white">Site Icon / Favicon</h2>
      </div>
      <div className="p-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {iconUrl ? (
            <img src={iconUrl} alt="Site icon" className="w-full h-full object-contain p-1" />
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 mb-1">Upload your site icon/favicon</p>
          <p className="text-xs text-slate-500 mb-3">PNG, JPG, SVG, ICO — Recommended: 32×32 or 64×64 px</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleIconUpload(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Choose Icon</>}
          </button>
          {uploadError && (
            <p className="text-xs text-red-400 mt-2">⚠ {uploadError}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [mode, setMode] = useState<ChangeMode>('password')
  const [form, setForm] = useState<SettingsForm>({
    mode: 'password',
    newUsername: '',
    newPassword: '',
    confirmPassword: '',
    newEmail: '',
    adminEmail: '',
    otp: '',
  })
  const [otpStep, setOtpStep] = useState<OtpStep>('idle')
  const [otpError, setOtpError] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const set = (k: keyof SettingsForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setOtpError('')
  }

  const validate = (): string => {
    if (!form.adminEmail) return 'Enter the admin email to receive the OTP.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) return 'Enter a valid email address.'
    if (mode === 'username' && form.newUsername.trim().length < 3)
      return 'New username must be at least 3 characters.'
    if (mode === 'password') {
      if (form.newPassword.length < 8) return 'Password must be at least 8 characters.'
      if (form.newPassword !== form.confirmPassword) return 'Passwords do not match.'
    }
    if (mode === 'email') {
      if (!form.newEmail) return 'New email address is required.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail)) return 'Enter a valid new email.'
    }
    return ''
  }

  const handleSendOtp = async () => {
    const err = validate()
    if (err) { setOtpError(err); return }

    setOtpStep('sending')
    setOtpError('')

    try {
      const res = await fetch('/api/admin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.adminEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpStep('sent')
        setCountdown(60)
        addToast('OTP sent! Check your inbox.', 'success')
      } else {
        setOtpError(data.message || 'Failed to send OTP.')
        setOtpStep('idle')
      }
    } catch {
      setOtpError('Network error. Please try again.')
      setOtpStep('idle')
    }
  }

  const handleUpdate = async () => {
    if (!form.otp.trim()) { setOtpError('Please enter the OTP from your email.'); return }
    setOtpStep('verifying')
    setOtpError('')

    try {
      const payload: Record<string, string> = { otp: form.otp.trim() }
      if (mode === 'username') payload.newUsername = form.newUsername.trim()
      if (mode === 'password') { payload.newPassword = form.newPassword; payload.confirmPassword = form.confirmPassword }
      if (mode === 'email')    payload.newEmail = form.newEmail.trim()

      const res = await fetch('/api/admin/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        setOtpStep('done')
        addToast(data.message, 'success')
        // Reset form
        setForm({ mode: 'password', newUsername: '', newPassword: '', confirmPassword: '', newEmail: '', adminEmail: '', otp: '' })
        setTimeout(() => setOtpStep('idle'), 3000)
      } else {
        setOtpError(data.message || 'Verification failed.')
        setOtpStep('sent')
      }
    } catch {
      setOtpError('Network error. Please try again.')
      setOtpStep('sent')
    }
  }

  const reset = () => {
    setOtpStep('idle')
    setOtpError('')
    setForm((f) => ({ ...f, otp: '' }))
    setCountdown(0)
  }

  const [notifStatus, setNotifStatus] = React.useState<string>('checking')
  const [notifLoading, setNotifLoading] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifStatus('unsupported')
      return
    }
    setNotifStatus(Notification.permission)
  }, [])

  const handleEnableNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      addToast('Push notifications are not supported on this device/browser.', 'error')
      return
    }
    setNotifLoading(true)
    try {
      // ── Step 1: Request permission via user gesture (mandatory on iOS) ─────
      // On iOS, Notification.requestPermission() MUST be called from a direct
      // user interaction (button click). It cannot be called programmatically
      // on page load — iOS silently ignores it and permission stays "default".
      const permission = await Notification.requestPermission()
      setNotifStatus(permission)
      if (permission !== 'granted') {
        addToast('Notification permission denied. Enable it in iOS Settings → Safari → [your site] → Notifications.', 'error')
        setNotifLoading(false)
        return
      }

      // ── Step 2: Get the admin service worker registration ─────────────────
      // navigator.serviceWorker.ready returns the SW controlling this page.
      // On /admin/* that is admin-sw.js (scope "/admin"), registered by
      // pwa-register.tsx. This is the correct SW for iOS push delivery —
      // iOS ties push to the PWA context matching the manifest scope "/admin".
      const reg = await navigator.serviceWorker.ready
      console.log('[Notifications] Using SW scope:', reg.scope)

      // ── Step 3: Fetch VAPID public key ────────────────────────────────────
      const keyRes = await fetch('/api/admin/push-subscribe')
      if (!keyRes.ok) {
        const errBody = await keyRes.json().catch(() => ({}))
        addToast(`VAPID key fetch failed (${keyRes.status}): ${errBody?.error || 'Check server config.'}`, 'error')
        setNotifLoading(false)
        return
      }
      const { publicKey } = await keyRes.json()
      if (!publicKey) {
        addToast('VAPID public key missing on server. Check VAPID_PUBLIC_KEY env var.', 'error')
        setNotifLoading(false)
        return
      }

      const padding          = '='.repeat((4 - (publicKey.length % 4)) % 4)
      const base64           = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawData          = atob(base64)
      const applicationServerKey = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))

      // ── Step 4: Force-fresh subscription ─────────────────────────────────
      // Always unsubscribe and re-subscribe when the user explicitly enables
      // notifications. This ensures:
      //   a) Stale subscriptions from the old root SW (scope "/") are replaced
      //      with ones bound to admin-sw.js (scope "/admin") for iOS push.
      //   b) Expired subscriptions (APNs rotates endpoints) are renewed.
      //   c) The DB always has the current valid endpoint.
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await existing.unsubscribe().catch(() => {})
      }

      const sub  = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
      const json = sub.toJSON()

      // ── Step 5: Persist subscription in DB ───────────────────────────────
      const saveRes = await fetch('/api/admin/push-subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:    JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      if (!saveRes.ok) {
        addToast('Subscribed locally but failed to save to server. Notifications may not work.', 'error')
        setNotifLoading(false)
        return
      }

      addToast('🔔 Push notifications enabled! You will receive alerts on this device.', 'success')
    } catch (err: any) {
      // Surface the full error — silent failures are the #1 debugging enemy
      console.error('[Notifications] Enable failed:', err)
      addToast(`Failed to enable notifications: ${err?.message || String(err)}`, 'error')
    } finally {
      setNotifLoading(false)
    }
  }

  const handleTestNotification = async () => {
    if (Notification.permission !== 'granted') {
      addToast('Enable notifications first.', 'error')
      return
    }
    try {
      // Send via the server-side push pipeline — this tests the FULL path:
      // Server → VAPID → FCM/APNs → Service Worker → Device notification
      // This is the same path real notifications use (contact form, chat, etc.)
      const res = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          data: {
            title: '🔔 Test Notification',
            body:  'Push notifications are working correctly! You will receive alerts like this for new messages, chats, and security events.',
            tag:   'test-notification',
            data:  { url: '/admin/dashboard' },
          },
        }),
      })
      const result = await res.json()
      if (result.ok && result.sent > 0) {
        addToast(`✅ Test notification sent to ${result.sent} device(s). Check your phone!`, 'success')
      } else if (result.ok && result.sent === 0) {
        addToast('No active push subscriptions found. Please tap "Re-subscribe This Device" first.', 'error')
      } else {
        // Fallback: local SW notification (for when server push fails)
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification('🔔 Test Notification (Local)', {
          body:     'Server-side push failed. Check VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.',
          icon:     '/icons/icon-192x192.png',
          badge:    '/icons/icon-192x192.png',
          tag:      'test-notification',
          data:     { url: '/admin/dashboard' },
        } as NotificationOptions)
        addToast(`Server push failed (check VAPID keys). Local notification shown.`, 'error')
      }
    } catch (err: any) {
      console.error('[Notifications] Test failed:', err)
      addToast(`Test failed: ${err?.message || String(err)}`, 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Push Notifications Card */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Push Notifications</h3>
            <p className="text-xs text-slate-500">Enable mobile push alerts for new messages, chats &amp; security events</p>
          </div>
          <div className="ml-auto">
            {notifStatus === 'granted' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Enabled
              </span>
            )}
            {notifStatus === 'denied' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                <AlertCircle className="w-3 h-3" /> Blocked
              </span>
            )}
            {notifStatus === 'default' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full">
                <Bell className="w-3 h-3" /> Not set
              </span>
            )}
          </div>
        </div>
        <div className="p-6 space-y-4">
          {notifStatus === 'denied' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
              <p className="font-semibold mb-1">Notifications are blocked in your browser</p>
              <p className="text-xs text-red-400">To fix: go to your browser Settings → Site Settings → Notifications → Allow this site. Then tap "Enable" below.</p>
            </div>
          )}
          {notifStatus === 'unsupported' && (
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 text-sm text-slate-400">
              Push notifications are not supported on this browser. For best experience, install this app as a PWA on your home screen (iOS 16.4+ or Android Chrome).
            </div>
          )}
          {(notifStatus === 'default' || notifStatus === 'granted') && (
            <p className="text-sm text-slate-400">
              {notifStatus === 'granted'
                ? 'This device will receive push alerts for new contact messages, live chats, suspicious activity, and block appeals — even when the browser is closed.'
                : 'Tap "Enable Notifications" to receive real-time push alerts on this device. You must do this on every device/browser you want to receive alerts on.'}
            </p>
          )}
          <div className="flex gap-3 flex-wrap">
            {notifStatus !== 'unsupported' && (
              <button
                onClick={handleEnableNotifications}
                disabled={notifLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {notifLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                {notifStatus === 'granted' ? 'Re-subscribe This Device' : 'Enable Notifications'}
              </button>
            )}
            {notifStatus === 'granted' && (
              <button
                onClick={handleTestNotification}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-white text-sm font-medium hover:bg-slate-700 transition-all"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Send Test Notification
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600">Notifications are sent for: new contact messages, live chat requests, suspicious activity, block appeals. OTP emails are excluded.</p>
        </div>
      </div>

      {/* ── Visitor Broadcast ─────────────────────────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/40 bg-slate-800/20">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-base">📢</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Broadcast to Visitors</h3>
            <p className="text-xs text-slate-500">Send a push notification to all subscribed visitors</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <VisitorBroadcastForm />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Account Settings</h2>
        <p className="text-slate-400 text-sm">Change your admin credentials. An OTP will be sent to your email for verification.</p>
      </div>

      {/* Mode picker */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(modeConfig) as ChangeMode[]).map((m) => {
          const cfg = modeConfig[m]
          const Icon = cfg.icon
          const active = mode === m
          return (
            <button
              key={m}
              onClick={() => { setMode(m); reset() }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-slate-900/60 border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-400' : ''}`} />
              <span className="text-center leading-tight">{cfg.label}</span>
            </button>
          )
        })}
      </div>

      {/* Form card */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
          {(() => { const Icon = modeConfig[mode as ChangeMode].icon; return <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500"><Icon className="w-4 h-4 text-white" /></div> })()}
          <div>
            <h3 className="font-semibold text-white text-sm">{modeConfig[mode as ChangeMode].label}</h3>
            <p className="text-xs text-slate-500">{modeConfig[mode as ChangeMode].desc}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1 — new value fields */}
          {otpStep === 'idle' || otpStep === 'sending' ? (
            <div className="space-y-4">
              {mode === 'username' && (
                <div>
                  <Label>New Username</Label>
                  <Input
                    value={form.newUsername}
                    onChange={(e) => set('newUsername', e.target.value)}
                    placeholder="Minimum 3 characters"
                  />
                </div>
              )}

              {mode === 'password' && (
                <>
                  <div>
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={form.newPassword}
                      onChange={(e) => set('newPassword', e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => set('confirmPassword', e.target.value)}
                      placeholder="Re-enter your new password"
                    />
                  </div>
                </>
              )}

              {mode === 'email' && (
                <div>
                  <Label>New Admin Email</Label>
                  <Input
                    type="email"
                    value={form.newEmail}
                    onChange={(e) => set('newEmail', e.target.value)}
                    placeholder="new-admin@example.com"
                  />
                </div>
              )}

              {/* OTP destination email */}
              <div>
                <Label>Send OTP to Email</Label>
                <Input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => set('adminEmail', e.target.value)}
                  placeholder="your-admin-email@example.com"
                />
                <p className="text-xs text-slate-500 mt-1.5">Must match the email registered in your <span className="font-mono text-slate-400">ADMIN_EMAIL</span> env var (or leave blank if none is set).</p>
              </div>

              {otpError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {otpError}
                </div>
              )}

              <button
                onClick={handleSendOtp}
                disabled={otpStep === 'sending'}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
              >
                {otpStep === 'sending' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…</>
                ) : (
                  <><SendHorizonal className="w-4 h-4" /> Send OTP to Email</>
                )}
              </button>
            </div>
          ) : otpStep === 'done' ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white">Credentials Updated!</p>
                <p className="text-sm text-slate-400 mt-1">Your changes have been saved successfully.</p>
              </div>
            </div>
          ) : (
            /* Step 2 — OTP verification */
            <div className="space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
                <div className="flex gap-3">
                  <SendHorizonal className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    A 6-digit OTP was sent to <strong className="text-white">{form.adminEmail}</strong>. Enter it below within 10 minutes.
                  </p>
                </div>
              </div>

              <div>
                <Label>Enter OTP</Label>
                <Input
                  value={form.otp}
                  onChange={(e) => set('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.5em] py-4"
                />
              </div>

              {otpError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {otpError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleUpdate}
                  disabled={otpStep === 'verifying' || form.otp.length < 6}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                >
                  {otpStep === 'verifying' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Verify & Update</>
                  )}
                </button>

                <button
                  onClick={handleSendOtp}
                  disabled={countdown > 0 || otpStep === 'verifying'}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
                </button>
              </div>

              <button
                onClick={reset}
                className="w-full text-xs text-slate-500 hover:text-slate-400 transition-colors pt-1"
              >
                ← Go back and change values
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Site Icon Upload */}
      <SiteIconSection addToast={addToast} />

      {/* Social Media Followers Settings */}
      <SocialFollowersSettings addToast={addToast} />

      {/* SMTP setup notice */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-2">Email (SMTP) Setup Required</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Add these to your <span className="font-mono text-slate-300">.env.local</span> file to enable OTP emails:
            </p>
            <pre className="text-xs bg-slate-900/60 border border-slate-700/40 rounded-lg p-3 text-slate-300 overflow-x-auto">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password   # Gmail App Password
ADMIN_EMAIL=your-gmail@gmail.com`}</pre>
            <p className="text-xs text-slate-500 mt-2">
              For Gmail: enable 2FA → generate an <strong className="text-slate-400">App Password</strong> at myaccount.google.com/apppasswords
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// JOURNEY SECTION — Blogs + Certificates admin panel
// ══════════════════════════════════════════════════════════════════════════════

function JourneySection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [tab, setTab] = useState<'profile' | 'stories' | 'blogs' | 'comments'>('profile')
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [certs, setCerts] = useState<Certificate[]>([])
  const [stories, setStories] = useState<JourneyStory[]>([])

  const refresh = async () => {
    const [b, c, s] = await Promise.all([getBlogs(), getCertificates(), getStories()])
    setBlogs(b)
    setCerts(c)
    setStories(s)
  }

  useEffect(() => {
    refresh()
    window.addEventListener('journey-data-updated', refresh)
    return () => window.removeEventListener('journey-data-updated', refresh)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Journey Manager</h2>
          <p className="text-slate-400 text-sm mt-1">Manage your journey profile, stories, blog posts, and certificates.</p>
        </div>
        <a href="/journey" target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all">
          <Eye className="w-4 h-4" />
          Preview
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'profile' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
          <UserCircle className="w-4 h-4" />
          Profile
        </button>
        <button onClick={() => setTab('stories')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'stories' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
          <Sparkles className="w-4 h-4" />
          Stories ({stories.length})
        </button>
        <button onClick={() => setTab('blogs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'blogs' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
          <ImageIcon className="w-4 h-4" />
          Blogs ({blogs.length})
        </button>
        <button onClick={() => setTab('comments')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'comments' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
          💬 Comments & Replies
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'profile' ? (
          <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <JourneyProfileAdmin addToast={addToast} />
          </motion.div>
        ) : tab === 'stories' ? (
          <motion.div key="stories" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <StoriesAdmin stories={stories} addToast={addToast} onRefresh={refresh} />
          </motion.div>
        ) : tab === 'blogs' ? (
          <motion.div key="blogs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <BlogsAdmin blogs={blogs} addToast={addToast} onRefresh={refresh} />
          </motion.div>
        ) : tab === 'comments' ? (
          <motion.div key="comments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <JourneyCommentsAdmin blogs={blogs} stories={stories} addToast={addToast} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// ─── Journey Comments Admin ────────────────────────────────────────────────────
function JourneyCommentsAdmin({ blogs, stories, addToast }: {
  blogs: any[]; stories: any[]; addToast: (msg: string, type?: any) => void
}) {
  const [allComments, setAllComments] = useState<{ postId: string; postTitle: string; comment: any }[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<{ postId: string; comment: any } | null>(null)
  useScrollLock(!!replyingTo)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  const loadComments = async () => {
    setLoading(true)
    const allPosts = [
      ...blogs.map(b => ({ id: b.id, title: b.title || b.caption || 'Blog post' })),
      ...stories.map(s => ({ id: s.id, title: s.caption || 'Story' })),
    ]
    const results: { postId: string; postTitle: string; comment: any }[] = []
    await Promise.all(allPosts.map(async post => {
      try {
        const res = await fetch(`/api/journey/likes?postId=${encodeURIComponent(post.id)}`)
        if (!res.ok) return
        const data = await res.json()
        for (const c of (data.comments || [])) {
          results.push({ postId: post.id, postTitle: post.title, comment: c })
        }
      } catch {}
    }))
    results.sort((a, b) => Number(b.comment.createdAt) - Number(a.comment.createdAt))
    setAllComments(results)
    setLoading(false)
  }

  useEffect(() => { loadComments() }, [blogs, stories])

  const handleReply = async () => {
    if (!replyingTo || !replyText.trim()) return
    setReplying(true)
    try {
      const res = await fetch('/api/journey/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: replyingTo.postId, action: 'adminReply', commentId: replyingTo.comment.id, replyText: replyText.trim() }),
      })
      if (res.ok) {
        addToast('Reply sent! User will receive an email notification.', 'success')
        setReplyingTo(null); setReplyText('')
        loadComments()
      } else {
        const d = await res.json()
        addToast(d.error || 'Failed to send reply', 'error')
      }
    } catch { addToast('Network error', 'error') }
    setReplying(false)
  }

  const formatTs = (ts: any) => {
    const d = new Date(Number(ts))
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold text-white">💬 All Comments & Replies</h3>
        <button onClick={loadComments} disabled={loading} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />} Refresh
        </button>
      </div>

      {/* Reply modal */}
      {replyingTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setReplyingTo(null)}
          onWheel={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Reply to {replyingTo.comment.author}</h3>
              <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
              <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Their comment</p>
              <p className="text-sm text-slate-300 italic">"{replyingTo.comment.text}"</p>
            </div>
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} placeholder="Type your reply here…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60 resize-none transition-all" />
            <p className="text-xs text-slate-500">{replyingTo.comment.email ? `Will send email notification to: ${replyingTo.comment.email}` : '⚠️ No email — user won\'t receive email notification'}</p>
            <div className="flex gap-2">
              <button onClick={() => setReplyingTo(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm hover:text-white transition-all">Cancel</button>
              <button onClick={handleReply} disabled={replying || !replyText.trim()} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-all">
                {replying ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <>💬 Send Reply</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /></div>
      ) : allComments.length === 0 ? (
        <div className="text-center py-12 text-slate-500"><p className="text-3xl mb-2">💬</p><p>No comments yet on any posts.</p></div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {allComments.map(({ postId, postTitle, comment }: { postId: string; postTitle: string; comment: any }) => (
            <div key={comment.id} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{comment.author}</span>
                    {comment.email && <span className="text-[10px] text-slate-500">{comment.email}</span>}
                  </div>
                  <span className="text-[10px] text-slate-500">on: <span className="text-slate-400">{postTitle}</span> · {formatTs(comment.createdAt)}</span>
                </div>
                <button onClick={() => { setReplyingTo({ postId, comment }); setReplyText('') }}
                  className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 text-xs font-medium transition-all">
                  💬 {comment.adminReply ? 'Edit Reply' : 'Reply'}
                </button>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-3 py-2.5 border border-slate-700/30">
                <p className="text-sm text-slate-200">{comment.text}</p>
              </div>
              {comment.adminReply && (
                <div className="bg-teal-950/30 border border-teal-500/20 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-teal-400 font-semibold uppercase mb-1">Admin Reply · {formatTs(comment.adminRepliedAt)}</p>
                  <p className="text-sm text-teal-100">{comment.adminReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stories Admin ─────────────────────────────────────────────────────────────

const STORY_EMOJIS = ['📸', '✈️', '💻', '🌟', '🎉', '🏔️', '🎵', '🌸', '🔥', '💡', '🤝', '🚀', '🌊', '🎨', '📚']

function StoriesAdmin({ stories, addToast, onRefresh }: {
  stories: JourneyStory[]
  addToast: (msg: string, type?: Toast['type']) => void
  onRefresh: () => void
}) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<JourneyStory>>({ label: '', title: '', emoji: '📸', media_id: '', media_type: 'image' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setForm({ label: '', title: '', emoji: '📸', media_id: '', media_type: 'image' })
    setPreviewUrl(null)
    setCreating(false)
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const isVideo = file.type.startsWith('video/')
      const localId = `story_${isVideo ? 'v' : 'i'}_${generateId()}`
      const blobUrl = await saveMedia(localId, file)
      setForm(f => ({ ...f, media_id: blobUrl, media_type: isVideo ? 'video' : 'image' }))
      setPreviewUrl(blobUrl)
    } catch (e: unknown) {
      addToast('Upload failed: ' + (e instanceof Error ? e.message : String(e)), 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.label?.trim()) { addToast('Label is required', 'error'); return }
    if (!form.media_id) { addToast('Please upload a photo or video', 'error'); return }
    setSaving(true)
    const story: JourneyStory = {
      id: generateId(),
      label: form.label!.trim(),
      title: form.title?.trim() || form.label!.trim(),
      emoji: form.emoji || '📸',
      media_id: form.media_id!,
      media_type: (form.media_type || 'image') as 'image' | 'video',
      created_at: Date.now(),
    }
    await saveStory(story)
    addToast('Story added!')
    onRefresh()
    resetForm()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this story?')) return
    await deleteStory(id)
    addToast('Story deleted.')
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Journey Stories</h3>
          <p className="text-slate-400 text-xs mt-0.5">Stories appear in the Instagram-style ring on the Journey page.</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 rounded-xl text-sm text-white font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Story
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-slate-900/60 border border-orange-500/30 rounded-2xl p-5 space-y-4">
          <h4 className="font-medium text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-orange-400" /> New Story</h4>

          {/* Emoji picker */}
          <div>
            <Label>Icon / Emoji</Label>
            <div className="flex flex-wrap gap-2">
              {STORY_EMOJIS.map(em => (
                <button key={em} onClick={() => setForm(f => ({ ...f, emoji: em }))}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${form.emoji === em ? 'bg-orange-500 ring-2 ring-orange-400 scale-110' : 'bg-slate-800 hover:bg-slate-700'}`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Label + Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Story Label * (shown below circle)</Label>
              <Input value={form.label || ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Travel, Code, Life…" />
            </div>
            <div>
              <Label>Story Title (optional)</Label>
              <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="My adventure in Manali" />
            </div>
          </div>

          {/* Media upload */}
          <div>
            <Label>Story Photo / Video *</Label>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            {previewUrl ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-orange-500">
                {form.media_type === 'video'
                  ? <video src={previewUrl} className="w-full h-full object-cover" muted playsInline />
                  : <img src={previewUrl} alt="" className="w-full h-full object-cover" />}
                <button onClick={() => { setPreviewUrl(null); setForm(f => ({ ...f, media_id: '' })) }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-24 h-24 rounded-full border-2 border-dashed border-slate-600 hover:border-orange-500/50 flex flex-col items-center justify-center text-slate-400 hover:text-orange-400 transition-all">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-[10px] mt-1">Upload</span></>}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || uploading}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 rounded-xl text-sm text-white font-medium transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Story
            </button>
            <button onClick={resetForm} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm text-slate-300 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Stories list */}
      {stories.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No stories yet. Add your first story!</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {stories.map(s => (
            <div key={s.id} className="flex flex-col items-center gap-1.5 group relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-yellow-400 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-900">
                  {s.media_id ? (
                    s.media_type === 'video'
                      ? <video src={s.media_id.startsWith('http') ? s.media_id : `/api/journey/media?id=${s.media_id}`} className="w-full h-full object-cover" muted playsInline />
                      : <img src={s.media_id.startsWith('http') ? s.media_id : `/api/journey/media?id=${s.media_id}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">{s.emoji}</div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 truncate max-w-[64px]">{s.label}</span>
              <button onClick={() => handleDelete(s.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Journey Profile Admin ─────────────────────────────────────────────────────

function JourneyProfileAdmin({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [profile, setProfile] = useState<JourneyProfile>({
    bio: '', name: '', tagline: '', mainProfileUrl: '', journeyProfileUrl: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const mainPhotoRef = useRef<HTMLInputElement>(null)
  const journeyPhotoRef = useRef<HTMLInputElement>(null)
  const [followers, setFollowers] = useState<Array<{ id: string; name: string; email: string; ip: string; followed_at: number }>>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [showAddFollower, setShowAddFollower] = useState(false)
  const [newFollowerName, setNewFollowerName] = useState('')
  const [newFollowerEmail, setNewFollowerEmail] = useState('')
  const [addingFollower, setAddingFollower] = useState(false)

  const handleAddFollower = async () => {
    if (!newFollowerName.trim() || !newFollowerEmail.trim()) {
      addToast('Name and email are required', 'error'); return
    }
    setAddingFollower(true)
    try {
      const res = await fetch('/api/journey/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_add_follower', name: newFollowerName.trim(), email: newFollowerEmail.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        addToast(`Follower added! Total: ${data.count}`)
        setNewFollowerName('')
        setNewFollowerEmail('')
        setShowAddFollower(false)
        const updated = await fetch('/api/journey/follow?admin=1').then(r => r.json())
        setFollowers(updated.followers ?? [])
        setFollowersCount(updated.count ?? 0)
      } else {
        addToast(data.error || 'Failed to add follower', 'error')
      }
    } catch { addToast('Error adding follower', 'error') } finally { setAddingFollower(false) }
  }

  useEffect(() => {
    getJourneyProfile().then(p => { setProfile(p); setLoading(false) })
    fetch('/api/journey/follow?admin=1').then(r => r.json()).then(d => {
      setFollowersCount(d.count ?? 0)
      setFollowers(d.followers ?? [])
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await saveJourneyProfile(profile)
    setSaving(false)
    addToast('Journey profile updated!')
  }

  const handlePhotoUpload = async (file: File, field: 'mainProfileUrl' | 'journeyProfileUrl') => {
    addToast('Uploading photo...')
    const formData = new FormData()
    formData.append('id', `profile_${field}_${Date.now()}`)
    formData.append('file', file)
    const res = await fetch('/api/journey/media', { method: 'POST', body: formData })
    if (!res.ok) { addToast('Photo upload failed', 'error'); return }
    const json = await res.json()
    setProfile(p => ({ ...p, [field]: json.url }))
    addToast('Photo uploaded! Click Save to apply.')
  }

  if (loading) return (
    <div className="py-12 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Photo uploads side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main (Professional) Profile Photo */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
              <UserCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Main Dashboard Photo</p>
              <p className="text-slate-500 text-xs">Professional / formal photo</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
              {profile.mainProfileUrl ? (
                <img src={profile.mainProfileUrl} alt="Main profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-10 h-10 text-slate-600" />
              )}
            </div>
            <input ref={mainPhotoRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, 'mainProfileUrl') }} />
            <button onClick={() => mainPhotoRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-all">
              <Camera className="w-3.5 h-3.5" />
              {profile.mainProfileUrl ? 'Change Photo' : 'Upload Photo'}
            </button>
            {profile.mainProfileUrl && (
              <button onClick={() => setProfile(p => ({ ...p, mainProfileUrl: '' }))}
                className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
            )}
          </div>
        </div>

        {/* Journey (Adventure) Profile Photo */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-600 to-orange-500">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Journey Dashboard Photo</p>
              <p className="text-slate-500 text-xs">Adventure / explorer photo</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
              {profile.journeyProfileUrl ? (
                <img src={profile.journeyProfileUrl} alt="Journey profile" className="w-full h-full object-cover" />
              ) : (
                <Compass className="w-10 h-10 text-slate-600" />
              )}
            </div>
            <input ref={journeyPhotoRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, 'journeyProfileUrl') }} />
            <button onClick={() => journeyPhotoRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-all">
              <Camera className="w-3.5 h-3.5" />
              {profile.journeyProfileUrl ? 'Change Photo' : 'Upload Photo'}
            </button>
            {profile.journeyProfileUrl && (
              <button onClick={() => setProfile(p => ({ ...p, journeyProfileUrl: '' }))}
                className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
            )}
          </div>
        </div>
      </div>

      {/* Bio fields */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Pencil className="w-4 h-4 text-slate-400" />
          Journey Bio
        </h3>
        <div>
          <Label>Display Name</Label>
          <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            placeholder="Abhishek Singh" />
        </div>
        <div>
          <Label>Tagline (shown under name)</Label>
          <Input value={profile.tagline} onChange={e => setProfile(p => ({ ...p, tagline: e.target.value }))}
            placeholder="Capturing moments, building memories ✨" />
        </div>
        <div>
          <Label>Bio Description</Label>
          <Textarea rows={3} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            placeholder="DevOps Engineer · Full Stack Developer · Explorer..." />
        </div>

        {/* Blue tick + following count */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Instagram-style blue verified tick */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.8 5.4L17.6 4.2L16.8 8.1L20.4 9.9L18 13L20.4 16.1L16.8 17.9L17.6 21.8L13.8 20.6L12 24L10.2 20.6L6.4 21.8L7.2 17.9L3.6 16.1L6 13L3.6 9.9L7.2 8.1L6.4 4.2L10.2 5.4L12 2Z" fill={profile.blueTick ? '#3797F0' : '#4B5563'}/>
                  <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">Blue Tick</p>
                  <p className="text-xs text-slate-400">Verified badge</p>
                </div>
              </div>
              <button
                onClick={() => setProfile(p => ({ ...p, blueTick: !p.blueTick }))}
                className={`relative w-12 h-6 rounded-full transition-all ${profile.blueTick ? 'bg-blue-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${profile.blueTick ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
            <Label>Following Count</Label>
            <Input
              type="number"
              value={profile.followingCount ?? 318}
              onChange={e => setProfile(p => ({ ...p, followingCount: parseInt(e.target.value) || 0 }))}
              placeholder="318"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save Journey Profile'}
      </button>

    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-600 to-orange-500">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Followers</h3>
              <p className="text-slate-500 text-xs">{followersCount} people follow your journey</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddFollower(!showAddFollower)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white text-xs font-semibold rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Follower
          </button>
        </div>

        {/* Add Follower Form */}
        {showAddFollower && (
          <div className="bg-slate-800/70 border border-slate-700/40 rounded-xl p-4 mb-4 space-y-3">
            <p className="text-xs font-semibold text-slate-300">Add New Follower</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Name *</label>
                <input
                  value={newFollowerName}
                  onChange={e => setNewFollowerName(e.target.value)}
                  placeholder="Ravi Kumar"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={newFollowerEmail}
                  onChange={e => setNewFollowerEmail(e.target.value)}
                  placeholder="ravi@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddFollower} disabled={addingFollower}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
                {addingFollower ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {addingFollower ? 'Adding…' : 'Add'}
              </button>
              <button onClick={() => { setShowAddFollower(false); setNewFollowerName(''); setNewFollowerEmail('') }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-all">
                Cancel
              </button>
            </div>
            <p className="text-xs text-slate-500">Original followers are preserved. This adds to the existing list.</p>
          </div>
        )}

        {followers.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No followers yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {followers.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {f.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{f.name}</p>
                  {f.email && <p className="text-xs text-slate-400 truncate">{f.email}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">{new Date(f.followed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p className="text-[10px] text-slate-600">{new Date(f.followed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


// ─── Blogs Admin ──────────────────────────────────────────────────────────────

function BlogsAdmin({ blogs, addToast, onRefresh }: {
  blogs: BlogPost[]
  addToast: (msg: string, type?: Toast['type']) => void
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [creating, setCreating] = useState(false)

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    await deleteBlog(post.id)
    addToast('Blog post deleted.')
    onRefresh()
  }

  if (editing) return (
    <BlogEditor
      post={editing}
      onSave={async (p) => { await saveBlog(p); setEditing(null); addToast('Blog post saved!'); onRefresh() }}
      onCancel={() => setEditing(null)}
    />
  )

  if (creating) return (
    <BlogEditor
      post={null}
      onSave={async (p) => { await saveBlog({ ...p, _isNew: true } as any); setCreating(false); addToast('Blog post created!'); onRefresh() }}
      onCancel={() => setCreating(false)}
    />
  )

  return (
    <div className="space-y-4">
      <button onClick={() => setCreating(true)}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-600 hover:border-rose-500/50 rounded-2xl text-slate-400 hover:text-rose-400 text-sm font-medium transition-all">
        <Plus className="w-5 h-5" />
        Create New Blog Post
      </button>

      {blogs.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No blog posts yet. Create your first memory!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blogs.map(post => (
            <div key={post.id} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0">
                {post.coverMediaId ? (
                  <MediaPreviewThumb mediaId={post.coverMediaId} isVideo={post.coverMediaId.includes('_v_')} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{post.title}</p>
                <p className="text-slate-400 text-xs mt-0.5 truncate">{post.description}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {post.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />{post.location}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{post.mediaIds.length} media</span>
                  {post.audioId && <span className="flex items-center gap-1 text-xs text-slate-500"><Music className="w-3 h-3" />audio</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setEditing(post)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white transition-all">
                  Edit
                </button>
                <button onClick={() => handleDelete(post)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Media preview thumbnail (admin) ─────────────────────────────────────────

function MediaPreviewThumb({ mediaId, isVideo }: { mediaId: string; isVideo: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    getMediaUrl(mediaId).then(u => setUrl(u))
  }, [mediaId])

  if (!url) return <div className="w-full h-full bg-slate-800 animate-pulse" />
  if (isVideo) return <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
  return <img src={url} alt="" className="w-full h-full object-cover" />
}

// ─── Blog Editor ──────────────────────────────────────────────────────────────

function BlogEditor({ post, onSave, onCancel }: {
  post: BlogPost | null
  onSave: (p: BlogPost) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<BlogPost>(post ?? {
    id: generateId(),
    title: '',
    description: '',
    caption: '',
    location: '',
    experience: '',
    date: new Date().toISOString().split('T')[0],
    tags: [],
    mediaIds: [],
    coverMediaId: '',
    audioId: undefined,
    audioName: undefined,
    createdAt: Date.now(),
  })
  const [tagInput, setTagInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [mediaList, setMediaList] = useState<Array<{ id: string; name: string; type: 'image' | 'video'; size: number }>>([])
  const [audioInfo, setAudioInfo] = useState<{ name: string; startTime?: number; endTime?: number } | null>(
    post?.audioName ? { name: post.audioName, startTime: post.audioStartTime, endTime: post.audioEndTime } : null
  )
  const [showSongPicker, setShowSongPicker] = useState(false)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [captionEditing, setCaptionEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const mediaRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)

  const setField = (k: keyof BlogPost, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !form.tags.includes(t)) setField('tags', [...form.tags, t])
    setTagInput('')
  }

  const removeTag = (t: string) => setField('tags', form.tags.filter(x => x !== t))

  const handleMediaUpload = async (files: FileList) => {
    setUploading(true)
    setUploadError(null)
    const newIds: string[] = []
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/')
        const localId = `${isVideo ? 'blog_v' : 'blog_i'}_${generateId()}`
        // saveMedia now returns the permanent Vercel Blob URL — use it as the ID
        const blobUrl = await saveMedia(localId, file)
        newIds.push(blobUrl)
        setMediaList(prev => [...prev, { id: blobUrl, name: file.name, type: isVideo ? 'video' : 'image', size: file.size }])
      }
      const updatedIds = [...form.mediaIds, ...newIds]
      setField('mediaIds', updatedIds)
      if (!form.coverMediaId && updatedIds.length > 0) setField('coverMediaId', updatedIds[0])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setUploadError(msg.includes('BLOB_READ_WRITE_TOKEN') || msg.includes('not configured')
        ? 'Media storage is not configured. Add BLOB_READ_WRITE_TOKEN to your environment variables.'
        : `Upload failed: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  const removeMedia = (id: string) => {
    const updated = form.mediaIds.filter(x => x !== id)
    setField('mediaIds', updated)
    setMediaList(prev => prev.filter(m => m.id !== id))
    if (form.coverMediaId === id) setField('coverMediaId', updated[0] ?? '')
  }

  const handleSongSelect = (selection: any) => {
    setField('audioId', selection.song.previewUrl)
    setField('audioName', `${selection.song.title} — ${selection.song.artist}`)
    setField('audioStartTime', selection.startTime)
    setField('audioEndTime', selection.endTime)
    setAudioInfo({ name: `${selection.song.title} — ${selection.song.artist}`, startTime: selection.startTime, endTime: selection.endTime })
    setShowSongPicker(false)
  }

  const removeAudio = () => {
    setField('audioId', undefined)
    setField('audioName', undefined)
    setField('audioStartTime', undefined)
    setField('audioEndTime', undefined)
    setAudioInfo(null)
  }

  const generateCaption = async () => {
    setGeneratingCaption(true)
    try {
      const res = await fetch('/api/journey/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          tags: form.tags,
          location: form.location,
          experience: form.experience,
        }),
      })
      const data = await res.json()
      if (data.caption) setField('caption', data.caption)
    } catch (e) {
      console.error('Caption generation failed:', e)
    } finally {
      setGeneratingCaption(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Title is required'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    onSave(form)
    setSaving(false)
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-600 to-orange-500">
          <ImageIcon className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-semibold text-white">{post ? 'Edit Blog Post' : 'New Blog Post'}</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="My amazing adventure in..." />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={e => setField('location', e.target.value)} placeholder="New Delhi, India" />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="#travel #learning" className="flex-1" />
              <button onClick={addTag} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-rose-500/15 text-rose-300 rounded-full border border-rose-500/20">
                    #{t}
                    <button onClick={() => removeTag(t)} className="hover:text-red-300"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)}
            placeholder="Share the story of this moment..." />
        </div>

        <div>
          <Label>What I Experienced / Learned</Label>
          <Textarea rows={3} value={form.experience} onChange={e => setField('experience', e.target.value)}
            placeholder="What did this experience teach me? How did it make me feel? What memories did it create?" />
        </div>

        {/* Media upload */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Photos & Videos</Label>
            <span className="text-xs text-slate-500">{form.mediaIds.length} file{form.mediaIds.length !== 1 ? 's' : ''} · Supports HD images, 4K videos</span>
          </div>

          <input
            ref={mediaRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleMediaUpload(e.target.files)}
          />

          <button onClick={() => mediaRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-3 py-8 border-2 border-dashed border-slate-600 hover:border-rose-500/50 rounded-xl text-slate-400 hover:text-rose-400 transition-all disabled:opacity-50">
            {uploading ? (
              <><Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm">Uploading…</span></>
            ) : (
              <>
                <Upload className="w-8 h-8" />
                <div className="text-sm text-center">
                  <p className="font-medium">Click to upload photos & videos</p>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP, MP4, MOV, MKV — Any size</p>
                </div>
              </>
            )}
          </button>

          {/* Upload error message */}
          {uploadError && (
            <div className="mt-2 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
              <div className="text-xs text-red-300 leading-relaxed">
                <p className="font-semibold mb-0.5">Upload failed</p>
                <p>{uploadError}</p>
                {uploadError.includes('BLOB_READ_WRITE_TOKEN') && (
                  <p className="mt-1 text-red-400/80">
                    Go to <strong>Vercel Dashboard → Storage → Blob</strong>, create a store, then copy the token into your <code className="bg-red-500/20 px-1 rounded">.env.local</code> and Vercel environment variables.
                  </p>
                )}
              </div>
              <button onClick={() => setUploadError(null)} className="ml-auto text-red-400/60 hover:text-red-400 flex-shrink-0">✕</button>
            </div>
          )}

          {/* Media list */}
          {form.mediaIds.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {form.mediaIds.map((id, idx) => (
                <div key={id} className={`relative group rounded-xl overflow-hidden aspect-square ${form.coverMediaId === id ? 'ring-2 ring-rose-500' : ''}`}>
                  <MediaPreviewThumb mediaId={id} isVideo={isVideoId(id)} />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                    {form.coverMediaId !== id && (
                      <button onClick={() => setField('coverMediaId', id)}
                        className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full text-white transition-colors">
                        Cover
                      </button>
                    )}
                    <button onClick={() => removeMedia(id)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {form.coverMediaId === id && (
                    <div className="absolute top-1 left-1 text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded-full">Cover</div>
                  )}
                  {isVideoId(id) && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                      <Film className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Caption Generator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              AI Caption
              <span className="text-slate-500 font-normal text-xs">(optional — shown on post)</span>
            </label>
            <div className="flex items-center gap-2">
              {form.caption && (
                <button
                  onClick={() => setCaptionEditing(e => !e)}
                  className="text-xs text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  {captionEditing ? 'Done' : 'Edit'}
                </button>
              )}
              <button
                onClick={generateCaption}
                disabled={generatingCaption}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gradient-to-r from-rose-600/20 to-orange-500/20 hover:from-rose-600/30 hover:to-orange-500/30 border border-rose-500/30 text-rose-300 rounded-lg transition-all disabled:opacity-50"
              >
                {generatingCaption
                  ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
                  : <><Sparkles className="w-3 h-3" />{form.caption ? 'Regenerate' : 'Generate Caption'}</>
                }
              </button>
            </div>
          </div>

          {form.caption ? (
            captionEditing ? (
              <textarea
                value={form.caption}
                onChange={e => setField('caption', e.target.value)}
                rows={3}
                className="w-full bg-slate-800/60 border border-slate-700/40 focus:border-rose-500/50 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-slate-500 focus:outline-none resize-none transition-colors"
                placeholder="Write or paste your caption here…"
              />
            ) : (
              <div className="bg-gradient-to-br from-rose-500/8 to-orange-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{form.caption}</p>
              </div>
            )
          ) : (
            <button
              onClick={generateCaption}
              disabled={generatingCaption}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-700 hover:border-rose-500/40 rounded-xl text-slate-500 hover:text-rose-400 text-xs transition-all disabled:opacity-50"
            >
              {generatingCaption
                ? <><Loader2 className="w-4 h-4 animate-spin" />Generating smart caption…</>
                : <><Sparkles className="w-4 h-4" />Generate AI caption for this post</>
              }
            </button>
          )}
        </div>

        {/* Song picker */}
        <div>
          <Label>Background Music (optional)</Label>

          {audioInfo ? (
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{audioInfo.name}</p>
                <p className="text-xs text-slate-500">
                  {audioInfo.startTime !== undefined && audioInfo.endTime !== undefined
                    ? `Clip: ${formatTime(audioInfo.startTime)} – ${formatTime(audioInfo.endTime)} (${formatTime(audioInfo.endTime - audioInfo.startTime)})`
                    : 'Background music for this post'}
                </p>
              </div>
              <button onClick={() => setShowSongPicker(true)} className="text-xs text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-blue-500/40">
                Change
              </button>
              <button onClick={removeAudio} className="text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSongPicker(true)}
              className="w-full flex items-center justify-center gap-3 py-4 border border-dashed border-slate-700 hover:border-rose-500/40 rounded-xl text-slate-400 hover:text-rose-400 text-sm transition-all">
              <Music className="w-5 h-5" />
              <span>Add music from library — Haryanvi, Punjabi, Bollywood, Hollywood & more</span>
            </button>
          )}

          {showSongPicker && (
            <SongPicker
              currentSongId={form.audioId}
              onSelect={handleSongSelect}
              onClose={() => setShowSongPicker(false)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg transition-all">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Post</>}
          </button>
          <button onClick={onCancel}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Certificates Admin ────────────────────────────────────────────────────────

function CertsAdmin({ certs, addToast, onRefresh }: {
  certs: Certificate[]
  addToast: (msg: string, type?: Toast['type']) => void
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState<Certificate | null>(null)
  const [creating, setCreating] = useState(false)

  const handleDelete = async (cert: Certificate) => {
    if (!confirm(`Delete "${cert.title}"?`)) return
    await deleteCertificate(cert.id)
    addToast('Certificate deleted.')
    onRefresh()
  }

  if (editing) return (
    <CertEditor
      cert={editing}
      onSave={async (c) => { await saveCertificate(c); setEditing(null); addToast('Certificate saved!'); onRefresh() }}
      onCancel={() => setEditing(null)}
    />
  )

  if (creating) return (
    <CertEditor
      cert={null}
      onSave={async (c) => { await saveCertificate({ ...c, _isNew: true } as any); setCreating(false); addToast('Certificate uploaded!'); onRefresh() }}
      onCancel={() => setCreating(false)}
    />
  )

  return (
    <div className="space-y-4">
      <button onClick={() => setCreating(true)}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-600 hover:border-blue-500/50 rounded-2xl text-slate-400 hover:text-blue-400 text-sm font-medium transition-all">
        <Plus className="w-5 h-5" />
        Upload New Certificate
      </button>

      {certs.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No certificates yet. Upload your achievements!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {certs.map(cert => (
            <div key={cert.id} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 flex gap-4">
              <div className="w-16 h-20 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {cert.fileType === 'image' ? (
                  <MediaPreviewThumb mediaId={cert.mediaId} isVideo={false} />
                ) : (
                  <FileText className="w-7 h-7 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm line-clamp-2">{cert.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{cert.issuer}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded-full border border-blue-500/20">{cert.category || 'Certificate'}</span>
                  <span className="text-xs text-slate-500">{cert.date}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setEditing(cert)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white transition-all">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(cert)}
                    className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Certificate Editor ────────────────────────────────────────────────────────

const CERT_CATEGORIES = ['Web Dev', 'Cloud', 'AI/ML', 'DevOps', 'Data Science', 'Cybersecurity', 'Mobile Dev', 'Other']

function CertEditor({ cert, onSave, onCancel }: {
  cert: Certificate | null
  onSave: (c: Certificate) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Certificate>(cert ?? {
    id: generateId(),
    title: '',
    issuer: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Web Dev',
    mediaId: '',
    fileType: 'image',
    fileName: '',
    createdAt: Date.now(),
  })
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(
    cert?.fileName ? { name: cert.fileName, size: 0, type: cert.fileType } : null
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const setField = (k: keyof Certificate, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const isPdf = file.type === 'application/pdf'
      const localId = `cert_${isPdf ? 'pdf' : 'img'}_${generateId()}`
      // saveMedia returns the permanent Vercel Blob URL
      const blobUrl = await saveMedia(localId, file)
      setField('mediaId', blobUrl)
      setField('fileType', isPdf ? 'pdf' : 'image')
      setField('fileName', file.name)
      setFileInfo({ name: file.name, size: file.size, type: isPdf ? 'pdf' : 'image' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setUploadError(msg.includes('BLOB_READ_WRITE_TOKEN') || msg.includes('not configured')
        ? 'Media storage is not configured. Add BLOB_READ_WRITE_TOKEN to your environment variables.'
        : `Upload failed: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Title is required'); return }
    if (!form.mediaId) { alert('Please upload a file'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    onSave(form)
    setSaving(false)
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
          <Award className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-semibold text-white">{cert ? 'Edit Certificate' : 'Upload Certificate'}</h2>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Certificate Title *</Label>
            <Input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="AWS Certified Solutions Architect" />
          </div>
          <div>
            <Label>Issuing Organization</Label>
            <Input value={form.issuer} onChange={e => setField('issuer', e.target.value)} placeholder="Amazon Web Services" />
          </div>
          <div>
            <Label>Date Issued</Label>
            <Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all"
            >
              {CERT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Brief description of this certificate" />
          </div>
        </div>

        {/* File upload */}
        <div>
          <Label>Certificate File (PDF or Image) *</Label>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {fileInfo ? (
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                {fileInfo.type === 'pdf' ? <FileText className="w-5 h-5 text-blue-400" /> : <ImageIcon className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{fileInfo.name}</p>
                <p className="text-xs text-slate-500">{fileInfo.type.toUpperCase()} · {fileInfo.size > 0 ? formatFileSize(fileInfo.size) : 'Existing file'}</p>
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-all">
                Replace
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full flex flex-col items-center gap-3 py-8 border-2 border-dashed border-slate-600 hover:border-blue-500/50 rounded-xl text-slate-400 hover:text-blue-400 transition-all disabled:opacity-50">
              {uploading ? (
                <><Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm">Uploading…</span></>
              ) : (
                <>
                  <Upload className="w-8 h-8" />
                  <div className="text-sm text-center">
                    <p className="font-medium">Click to upload PDF or Image</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, WEBP — High quality supported</p>
                  </div>
                </>
              )}
            </button>
          )}

          {/* Upload error message */}
          {uploadError && (
            <div className="mt-2 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
              <div className="text-xs text-red-300 leading-relaxed">
                <p className="font-semibold mb-0.5">Upload failed</p>
                <p>{uploadError}</p>
                {uploadError.includes('BLOB_READ_WRITE_TOKEN') && (
                  <p className="mt-1 text-red-400/80">
                    Go to <strong>Vercel Dashboard → Storage → Blob</strong>, create a store, then copy the token into your <code className="bg-red-500/20 px-1 rounded">.env.local</code> and Vercel environment variables.
                  </p>
                )}
              </div>
              <button onClick={() => setUploadError(null)} className="ml-auto text-red-400/60 hover:text-red-400 flex-shrink-0">✕</button>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg transition-all">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Certificate</>}
          </button>
          <button onClick={onCancel}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Analytics Section ─────────────────────────────────────────────────────────

function AnalyticsSection() {
  const [summary, setSummary] = useState<any>(null)
  const [topQ, setTopQ] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [sumRes, topRes] = await Promise.all([
        fetch('/api/analytics?type=summary').then(r => r.json()),
        fetch('/api/analytics?type=top').then(r => r.json()),
      ])
      setSummary(sumRes.data)
      setTopQ(topRes.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const intentColor: Record<string, string> = {
    hire: 'from-blue-600 to-cyan-500',
    project: 'from-purple-600 to-pink-500',
    contact: 'from-orange-600 to-red-500',
    resume: 'from-green-600 to-teal-500',
    general: 'from-slate-600 to-slate-500',
  }
  const intentLabel: Record<string, string> = {
    hire: '💼 Hiring Intent',
    project: '🚀 Project Interest',
    contact: '📬 Contact',
    resume: '📄 Resume',
    general: '💬 General',
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">AI Analytics</h2>
          <p className="text-slate-400 text-sm">Track what visitors ask your chatbot and identify high-intent leads.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Questions', value: summary?.total ?? 0, icon: MessageSquare, color: 'from-blue-600 to-cyan-500' },
          { label: 'Today', value: summary?.today ?? 0, icon: Calendar, color: 'from-green-600 to-teal-500' },
          { label: 'Hiring Intent', value: summary?.intents?.find((i: any) => i.intent === 'hire')?.count ?? 0, icon: Briefcase, color: 'from-orange-600 to-red-500' },
          { label: 'Unique Questions', value: topQ.length, icon: BarChart2, color: 'from-purple-600 to-pink-500' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.color} mb-3 shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Intent breakdown */}
      {summary?.intents?.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Intent Breakdown</h3>
          <div className="space-y-3">
            {summary.intents.map((row: any) => {
              const pct = summary.total > 0 ? Math.round((parseInt(row.count) / summary.total) * 100) : 0
              const color = intentColor[row.intent] || 'from-slate-600 to-slate-500'
              return (
                <div key={row.intent} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-32 flex-shrink-0">{intentLabel[row.intent] || row.intent}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-300 w-16 text-right">{row.count} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top questions */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Top Asked Questions</h3>
        </div>
        <div className="divide-y divide-slate-700/30">
          {topQ.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No questions yet. Share your portfolio link to start collecting data!</p>
            </div>
          ) : topQ.slice(0, 30).map((q: any, i: number) => (
            <div key={i} className="flex items-start gap-4 px-6 py-3.5 hover:bg-slate-800/30 transition-colors">
              <span className="text-slate-500 text-xs font-mono w-5 mt-0.5 flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 leading-relaxed">{q.question}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                  q.intent === 'hire' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                  : q.intent === 'project' ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                  : q.intent === 'contact' ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20'
                  : q.intent === 'resume' ? 'bg-green-500/15 text-green-300 border border-green-500/20'
                  : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                }`}>
                  {intentLabel[q.intent] || q.intent}
                </span>
              </div>
              <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                <span className="font-semibold text-white">{q.count}</span>x
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      {summary?.recent?.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-600 to-teal-500">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-700/30">
            {summary.recent.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/30 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.intent === 'hire' ? 'bg-blue-400' : r.intent === 'project' ? 'bg-purple-400' : 'bg-slate-500'}`} />
                <p className="flex-1 text-sm text-slate-300 truncate">{r.question}</p>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {(() => { const ts = Number(r.created_at); return isNaN(ts) ? '—' : new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) })()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Conversations Section ──────────────────────────────────────────────────

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  intent?: string
}

interface ChatSession {
  session_id: string
  messages: ConversationMessage[]
  last_intent: string
  message_count: number
  created_at: string | number
  updated_at: string | number
  user_name?: string
  ip_address?: string
  browser_name?: string
  device_name?: string
  fingerprint?: string
  user_location?: string
  latitude?: number
  longitude?: number
}

function AIConversationsSection() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/chatbot-conversations?limit=100')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSessions(data.sessions || [])
      setTotal(data.total || 0)
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    setDeletingId(sessionId)
    try {
      await fetch('/api/admin/chatbot-conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
      setTotal(prev => prev - 1)
      if (expandedId === sessionId) setExpandedId(null)
    } finally {
      setDeletingId(null)
    }
  }

  const intentColor: Record<string, string> = {
    hire: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
    project: 'bg-purple-500/15 text-purple-300 border border-purple-500/20',
    contact: 'bg-orange-500/15 text-orange-300 border border-orange-500/20',
    resume: 'bg-green-500/15 text-green-300 border border-green-500/20',
    general: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  }
  const intentLabel: Record<string, string> = {
    hire: '💼 Hiring', project: '🚀 Project', contact: '📬 Contact',
    resume: '📄 Resume', general: '💬 General',
  }

  const filtered = sessions.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return s.session_id.toLowerCase().includes(q) ||
      (s.user_name || '').toLowerCase().includes(q) ||
      (s.ip_address || '').toLowerCase().includes(q) ||
      (s.browser_name || '').toLowerCase().includes(q) ||
      (s.device_name || '').toLowerCase().includes(q) ||
      (s.user_location || '').toLowerCase().includes(q) ||
      s.messages.some(m => m.content.toLowerCase().includes(q))
  })

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">AI Conversations</h2>
          <p className="text-slate-400 text-sm">Full chat history between visitors and your AI chatbot. {total} total sessions recorded.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: total, icon: Users, color: 'from-blue-600 to-cyan-500' },
          { label: 'Total Messages', value: sessions.reduce((a, s) => a + s.message_count, 0), icon: MessageSquare, color: 'from-purple-600 to-pink-500' },
          { label: 'Hiring Intent', value: sessions.filter(s => s.last_intent === 'hire').length, icon: Briefcase, color: 'from-orange-600 to-red-500' },
          { label: 'Avg Msgs/Session', value: sessions.length ? Math.round(sessions.reduce((a, s) => a + s.message_count, 0) / sessions.length) : 0, icon: BarChart2, color: 'from-green-600 to-teal-500' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.color} mb-3 shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search conversations by content or session ID..."
          className="w-full bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 transition-colors"
        />
      </div>

      {/* Conversation list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl py-16 text-center">
            <History className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 font-medium">
              {sessions.length === 0 ? 'No conversations yet.' : 'No conversations match your search.'}
            </p>
            {sessions.length === 0 && (
              <p className="text-slate-500 text-sm mt-1">Conversations will appear here once visitors start chatting.</p>
            )}
          </div>
        ) : filtered.map(session => {
          const isExpanded = expandedId === session.session_id
          const firstUserMsg = session.messages.find(m => m.role === 'user')
          const userMsgCount = session.messages.filter(m => m.role === 'user').length
          // Fix: BIGINT from Neon comes back as string — always parse via Number()
          const updatedAtMs = Number(session.updated_at)
          const createdAtMs = Number(session.created_at)
          const date = isNaN(updatedAtMs) ? '—' : new Date(updatedAtMs).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
          const createdDate = isNaN(createdAtMs) ? '—' : new Date(createdAtMs).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

          const handlePrint = () => {
            const win = window.open('', '_blank')
            if (!win) return
            const rows = session.messages.map(m => {
              const ts = Number(m.timestamp)
              const time = isNaN(ts) ? '' : new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
              return `<div style="margin:12px 0;padding:10px 14px;background:${m.role==='user'?'#1e2d45':'#1a2535'};border-radius:10px;border-left:4px solid ${m.role==='user'?'#3b82f6':'#22d3ee'}">
                <b style="color:${m.role==='user'?'#93c5fd':'#67e8f9'}">${m.role==='user'?'Visitor':'AI'}</b>
                <span style="color:#64748b;font-size:11px;margin-left:8px">${time}</span>
                <p style="margin:6px 0 0;color:#e2e8f0;white-space:pre-wrap">${m.content.replace(/</g,'&lt;')}</p>
              </div>`
            }).join('')
            win.document.write(`<!DOCTYPE html><html><head><title>Chat — ${session.user_name||session.session_id}</title>
              <style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;max-width:800px;margin:auto}
              h1{color:#fff;font-size:20px}table{width:100%;border-collapse:collapse;margin-bottom:16px}
              td{padding:4px 10px;color:#94a3b8;font-size:13px;vertical-align:top}
              td:first-child{color:#64748b;white-space:nowrap;width:130px}
              @media print{body{background:#fff;color:#000}td{color:#374151}}</style></head>
              <body><h1>💬 AI Conversation Log</h1>
              <table>
                <tr><td>Visitor Name</td><td>${session.user_name||'Anonymous'}</td></tr>
                <tr><td>Session ID</td><td>${session.session_id}</td></tr>
                <tr><td>IP Address</td><td>${session.ip_address||'—'}</td></tr>
                <tr><td>Browser</td><td>${session.browser_name||'—'}</td></tr>
                <tr><td>Device</td><td>${session.device_name||'—'}</td></tr>
                <tr><td>Location</td><td>${session.user_location||'—'}${session.latitude&&session.longitude?` (${Number(session.latitude).toFixed(4)}, ${Number(session.longitude).toFixed(4)})`:''}</td></tr>
                <tr><td>Fingerprint</td><td>${session.fingerprint||'—'}</td></tr>
                <tr><td>Started</td><td>${createdDate}</td></tr>
                <tr><td>Last Active</td><td>${date}</td></tr>
                <tr><td>Messages</td><td>${session.message_count}</td></tr>
                <tr><td>Intent</td><td>${intentLabel[session.last_intent]||session.last_intent}</td></tr>
              </table>
              <hr style="border-color:#1e293b;margin:16px 0">${rows}
              <p style="color:#475569;font-size:11px;margin-top:24px">Printed from Admin Panel • ${new Date().toLocaleString('en-IN')}</p>
              </body></html>`)
            win.document.close()
            win.focus()
            setTimeout(() => win.print(), 400)
          }

          return (
            <div key={session.session_id} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
              {/* Session header — click to expand */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/40 transition-colors text-left"
                onClick={() => setExpandedId(isExpanded ? null : session.session_id)}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {session.user_name && (
                      <span className="text-sm font-semibold text-white">{session.user_name}</span>
                    )}
                    <span className="text-xs font-mono text-slate-500 truncate max-w-[120px]">{session.session_id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${intentColor[session.last_intent] || intentColor.general}`}>
                      {intentLabel[session.last_intent] || session.last_intent}
                    </span>
                  </div>
                  {firstUserMsg && (
                    <p className="text-sm text-slate-300 truncate mt-0.5">{firstUserMsg.content}</p>
                  )}
                  {(session.browser_name || session.device_name || session.user_location) && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {[session.browser_name, session.device_name, session.user_location].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <p className="text-xs text-slate-400">{date}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{userMsgCount} questions • {session.message_count} messages</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {/* Expanded conversation view */}
              {isExpanded && (
                <div className="border-t border-slate-700/40">
                  {/* Visitor info card */}
                  <div className="mx-4 mt-4 mb-2 bg-slate-800/60 border border-slate-700/30 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      { label: '👤 Name',        value: session.user_name       || 'Anonymous' },
                      { label: '🌐 IP Address',   value: session.ip_address      || '—' },
                      { label: '🖥️ Browser',      value: session.browser_name    || '—' },
                      { label: '📱 Device',        value: session.device_name     || '—' },
                      { label: '📍 Location',      value: session.user_location   || '—' },
                      { label: '🔑 Fingerprint',   value: session.fingerprint     || '—' },
                      { label: '🕐 Started',       value: createdDate },
                      { label: '🕐 Last Active',   value: date },
                      { label: '💬 Messages',      value: String(session.message_count) },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-slate-500">{item.label}</p>
                        <p className="text-slate-300 truncate" title={item.value}>{item.value}</p>
                      </div>
                    ))}
                    {session.latitude && session.longitude ? (
                      <div>
                        <p className="text-slate-500">🗺️ Coordinates</p>
                        <a
                          href={`https://www.google.com/maps?q=${session.latitude},${session.longitude}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 truncate block"
                        >
                          {Number(session.latitude).toFixed(4)}, {Number(session.longitude).toFixed(4)}
                        </a>
                      </div>
                    ) : null}
                  </div>

                  {/* Action bar */}
                  <div className="flex items-center justify-end gap-3 px-5 py-2 border-b border-slate-700/40">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700/40"
                    >
                      🖨️ Print
                    </button>
                    <button
                      onClick={() => handleDelete(session.session_id)}
                      disabled={deletingId === session.session_id}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                    >
                      {deletingId === session.session_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {session.messages.map((msg, idx) => {
                      const msgTs = Number(msg.timestamp)
                      const msgTime = isNaN(msgTs) ? '' : new Date(msgTs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      return (
                      <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                        {/* Avatar */}
                        <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold
                          ${msg.role === 'user'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white'
                          }`}>
                          {msg.role === 'user' ? (session.user_name?.[0]?.toUpperCase() || 'V') : 'AI'}
                        </div>
                        {/* Bubble */}
                        <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed
                          ${msg.role === 'user'
                            ? 'bg-slate-800 text-slate-200 rounded-tl-sm'
                            : 'bg-blue-600/20 border border-blue-500/20 text-blue-100 rounded-tr-sm'
                          }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className="text-[10px] opacity-50 mt-1 text-right">
                            {msgTime}
                            {msg.intent && msg.intent !== 'general' && ` · ${intentLabel[msg.intent] || msg.intent}`}
                          </p>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-slate-600 pb-2">
          Showing {filtered.length} of {total} conversations
        </p>
      )}
    </div>
  )
}

// ─── Chatbot Setup Section ─────────────────────────────────────────────────────

function ChatbotSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [form, setForm] = useState({
    chatbot_name: '',
    whatsapp_number: '',
    calendly_url: '',
    notify_email: '',
    hire_email_enabled: 'true',
    resume_url: '/Cv.pdf',
    chatbot_personal_details: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) setForm(f => ({ ...f, ...d.settings }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) addToast('Chatbot settings saved!', 'success')
      else addToast('Save failed. Please try again.', 'error')
    } catch {
      addToast('Save failed. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Chatbot Setup</h2>
        <p className="text-slate-400 text-sm">Configure your AI chatbot, WhatsApp integration, Calendly booking, and lead notifications.</p>
      </div>

      {/* General */}
      <SectionCard title="General" icon={Bot}>
        <div className="space-y-4">
          <div>
            <Label>Chatbot Name</Label>
            <Input value={form.chatbot_name} onChange={e => set('chatbot_name', e.target.value)} placeholder="Abhishek's AI Assistant" />
            <p className="text-xs text-slate-500 mt-1">This name appears in the chat header and greeting message.</p>
          </div>
        </div>
      </SectionCard>

      {/* Personal Details for Chatbot */}
      <SectionCard title="Personal Details for Chatbot" icon={UserCircle}>
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Add any extra personal info you want the chatbot to share when visitors ask — hobbies, fun facts, availability, goals, or anything else not covered in your portfolio data.
          </p>
          <div>
            <Label>Extra Details</Label>
            <Textarea
              rows={6}
              value={form.chatbot_personal_details}
              onChange={e => set('chatbot_personal_details', e.target.value)}
              placeholder={`Examples:\n- I am available for freelance projects starting July 2025\n- I enjoy hiking, photography, and open-source contributions\n- I am open to remote or hybrid roles globally\n- My target salary range is ₹8–12 LPA`}
            />
            <p className="text-xs text-slate-500 mt-1">
              These details are injected directly into the chatbot's system prompt. Write in plain text or bullet points.
            </p>
          </div>
          {form.chatbot_personal_details && (
            <div className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-300 font-medium">Personal details will be shared with the chatbot ✓</p>
            </div>
          )}
        </div>
      </SectionCard>
      <SectionCard title="WhatsApp Integration" icon={Phone}>
        <div className="space-y-4">
          <div>
            <Label>WhatsApp Number</Label>
            <Input value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} placeholder="+91 98765 43210" />
            <p className="text-xs text-slate-500 mt-1">Include country code (e.g. +91...). A WhatsApp button will appear in the chatbot and high-intent responses.</p>
          </div>
          {form.whatsapp_number && (
            <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-300 font-medium">WhatsApp button active</p>
                <a href={`https://wa.me/${form.whatsapp_number.replace(/\D/g,'')}?text=Hello!`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-400/70 underline hover:text-green-400">Test link ↗</a>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Calendly */}
      <SectionCard title="Calendly / Book a Call" icon={Calendar}>
        <div className="space-y-4">
          <div>
            <Label>Calendly URL</Label>
            <Input value={form.calendly_url} onChange={e => set('calendly_url', e.target.value)} placeholder="https://calendly.com/your-username/30min" />
            <p className="text-xs text-slate-500 mt-1">A "Book a Call" button will appear in the chatbot toolbar and hiring-intent responses.</p>
          </div>
          {form.calendly_url && (
            <div className="flex items-center gap-3 bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-purple-300 font-medium">Calendly booking active</p>
                <a href={form.calendly_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-purple-400/70 underline hover:text-purple-400">Preview ↗</a>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Email Notifications */}
      <SectionCard title="Hire-Intent Email Alerts" icon={Bell}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-800/60 border border-slate-700/40 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Email alerts for hiring intent</p>
              <p className="text-xs text-slate-400 mt-0.5">Get notified instantly when a visitor asks about hiring you</p>
            </div>
            <button
              onClick={() => set('hire_email_enabled', form.hire_email_enabled === 'true' ? 'false' : 'true')}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.hire_email_enabled === 'true' ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.hire_email_enabled === 'true' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <div>
            <Label>Notification Email</Label>
            <Input value={form.notify_email} onChange={e => set('notify_email', e.target.value)} placeholder="your@email.com" type="email" />
            <p className="text-xs text-slate-500 mt-1">Leave blank to use ADMIN_EMAIL from environment variables.</p>
          </div>
          <div>
            <Label>Email From Address (Resend)</Label>
            <Input value={(form as any).resend_from_email || ''} onChange={e => set('resend_from_email', e.target.value)} placeholder="Your Name <noreply@yourdomain.com>" />
            <p className="text-xs text-slate-500 mt-1">The "From" address for all outgoing emails. Must be a verified sender in your Resend account. Leave blank to use RESEND_FROM_EMAIL env var.</p>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-blue-300">Required:</strong> Set <code className="text-blue-300 bg-blue-500/10 px-1 rounded">RESEND_API_KEY</code> and <code className="text-blue-300 bg-blue-500/10 px-1 rounded">ADMIN_EMAIL</code> in your .env.local or Vercel environment variables to enable email delivery.
            </p>
          </div>
          {/* Test Email */}
          <TestEmailButton />
        </div>
      </SectionCard>

      {/* Resume */}
      <SectionCard title="Resume / CV" icon={Download}>
        <div className="space-y-4">
          <div>
            <Label>Resume URL</Label>
            <Input value={form.resume_url} onChange={e => set('resume_url', e.target.value)} placeholder="/Cv.pdf" />
            <p className="text-xs text-slate-500 mt-1">Default is /Cv.pdf (already in /public). Upload a new one below or update the URL.</p>
          </div>
          <a href="/Cv.pdf" download className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <Download className="w-3.5 h-3.5" /> Preview current CV ↗
          </a>
        </div>
      </SectionCard>

      {/* Chatbot Preview */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-3">Feature Checklist</h3>
        <div className="space-y-2">
          {[
            { label: 'Voice Input (mic)', done: true, note: 'Built-in — works in Chrome/Edge/Safari' },
            { label: 'Chat Memory (localStorage)', done: true, note: 'Persists across page reloads' },
            { label: 'Analytics Tracking', done: true, note: `Go to AI Analytics tab to view data` },
            { label: 'Smart CTAs in Replies', done: true, note: 'Auto-injects based on intent' },
            { label: 'Quick Action Buttons', done: true, note: 'Download CV, Hire Me, WhatsApp, Book Call' },
            { label: 'WhatsApp Button', done: !!form.whatsapp_number, note: form.whatsapp_number ? 'Active' : 'Add WhatsApp number above' },
            { label: 'Book a Call (Calendly)', done: !!form.calendly_url, note: form.calendly_url ? 'Active' : 'Add Calendly URL above' },
            { label: 'Hire-Intent Email Alert', done: form.hire_email_enabled === 'true', note: form.hire_email_enabled === 'true' ? 'Requires SMTP env vars' : 'Enable toggle above' },
            { label: 'Resume Auto-Download', done: true, note: '/Cv.pdf is in /public' },
          ].map(({ label, done, note }) => (
            <div key={label} className="flex items-start gap-3 py-2 border-b border-slate-700/20 last:border-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${done ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                {done ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <X className="w-3 h-3 text-slate-500" />}
              </div>
              <div>
                <p className="text-sm text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Chatbot Settings</>}
      </button>
    </div>
  )
}

// ─── Messages Section ─────────────────────────────────────────────────────────
function MessagesSection({ onView }: { onView?: () => void }) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [summary, setSummary] = useState<{ total: number; today: number; hiring: number; unique: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'hiring' | 'general'>('all')
  const [archived, setArchived] = useState<Set<number>>(new Set())
  const [deleted, setDeleted] = useState<Set<number>>(new Set())
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [replyingTo, setReplyingTo] = useState<any>(null)
  useScrollLock(!!replyingTo)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const [replyError, setReplyError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [listRes, sumRes] = await Promise.all([
        fetch('/api/contact').then(r => r.json()),
        fetch('/api/contact?type=summary').then(r => r.json()),
      ])
      setMsgs(listRes.data || [])
      setSummary(sumRes.data)
    } catch {}
    setLoading(false)
  }

  const handleArchive = async (idx: number) => {
    const msg = msgs[idx]
    if (!msg) return
    try {
      await fetch(`/api/contact?id=${encodeURIComponent(msg.id)}&action=archive`, { method: 'PATCH' })
      setArchived(prev => { const s = new Set(prev); s.add(idx); return s })
    } catch {}
  }

  const handleDelete = (idx: number) => {
    setConfirmDelete(idx)
  }

  const confirmDeleteMsg = async (idx: number) => {
    const msg = msgs[idx]
    if (!msg) return
    try {
      await fetch(`/api/contact?id=${encodeURIComponent(msg.id)}`, { method: 'DELETE' })
      setDeleted(prev => { const s = new Set(prev); s.add(idx); return s })
    } catch {}
    setConfirmDelete(null)
  }

  const handleReply = (msg: any) => {
    setReplyingTo(msg)
    setReplyText('')
    setReplySuccess(false)
    setReplyError('')
  }

  const sendReply = async () => {
    if (!replyText.trim() || !replyingTo) return
    setSendingReply(true)
    setReplyError('')
    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: replyingTo.email,
          subject: replyingTo.subject || 'Message from Abhishek Singh Portfolio',
          message: replyText,
          senderName: 'Abhishek Singh',
          originalMessage: replyingTo.message || '',
          originalDate: replyingTo.created_at
            ? new Date(replyingTo.created_at).toLocaleString('en-IN', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata',
              })
            : '',
        }),
      })
      if (res.ok) {
        setReplySuccess(true)
        setReplyText('')
        setTimeout(() => setReplyingTo(null), 1500)
      } else {
        const data = await res.json()
        setReplyError(data.error || 'Failed to send reply')
      }
    } catch {
      setReplyError('Failed to send reply. Please try again.')
    } finally {
      setSendingReply(false)
    }
  }

  useEffect(() => { load(); onView?.() }, [])

  const activeMessages = msgs.filter((_, i) => !deleted.has(i))
  const visibleMessages = showArchived
    ? activeMessages.filter((m: any) => m.archived || archived.has(msgs.indexOf(m)))
    : activeMessages.filter((m: any) => !m.archived && !archived.has(msgs.indexOf(m)))
  const filtered = filter === 'all' ? visibleMessages : visibleMessages.filter((m: any) => m.intent === filter)

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Contact Messages</h2>
          <p className="text-slate-400 text-sm">Messages sent via the portfolio contact form.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowArchived(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm transition-all ${showArchived ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'}`}>
            <Download className="w-4 h-4" /> {showArchived ? 'Active' : 'Archived'} ({showArchived ? activeMessages.filter((_, i) => !archived.has(msgs.indexOf(activeMessages[i]))).length : archived.size})
          </button>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats matching admin panel categories */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Questions', value: summary?.total ?? 0, icon: MessageSquare, color: 'from-blue-600 to-cyan-500' },
          { label: 'Today', value: summary?.today ?? 0, icon: Calendar, color: 'from-green-600 to-teal-500' },
          { label: 'Hiring Intent', value: summary?.hiring ?? 0, icon: Briefcase, color: 'from-orange-600 to-red-500' },
          { label: 'Unique Questions', value: summary?.unique ?? 0, icon: BarChart2, color: 'from-purple-600 to-pink-500' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.color} mb-3 shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'hiring', 'general'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}>
            {f === 'all' ? 'All' : f === 'hiring' ? '💼 Hiring Intent' : '💬 General'}
          </button>
        ))}
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setReplyingTo(null)}
            onWheel={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                <div>
                  <p className="font-semibold text-white">Reply to {replyingTo.name}</p>
                  <p className="text-xs text-slate-400">Re: {replyingTo.subject || '(No subject)'}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-xs text-slate-400 p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-slate-300 italic">"{replyingTo.message}"</p>
                </div>
                {replySuccess ? (
                  <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
                    <CheckCircle className="w-4 h-4" /> Reply sent successfully!
                  </div>
                ) : (
                  <>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      rows={5}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 resize-none placeholder-slate-500"
                    />
                    {replyError && (
                      <p className="text-xs text-red-400">{replyError}</p>
                    )}
                    <Button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sendingReply}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {sendingReply ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : <><SendHorizonal className="w-4 h-4 mr-2" /> Send Reply</>}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages list */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No messages yet. Share your portfolio to start receiving messages!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filtered.map((msg: any, i: number) => {
              const origIdx = msgs.indexOf(msg)
              return (
                <motion.div
                  key={origIdx}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="px-6 py-4 hover:bg-slate-800/30 transition-colors relative group"
                >
                  <div className="flex items-start justify-between gap-4 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{msg.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        msg.intent === 'hiring'
                          ? 'bg-orange-500/15 text-orange-300 border-orange-500/20'
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/20'
                      }`}>
                        {msg.intent === 'hiring' ? '💼 Hiring Intent' : '💬 General'}
                      </span>
                      {(msg.archived || archived.has(origIdx)) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">📦 Archived</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-slate-500 mr-2">
                        {(() => {
                          const ts = typeof msg.created_at === 'string' ? parseInt(msg.created_at, 10) : Number(msg.created_at)
                          const d = new Date(ts)
                          const valid = !isNaN(d.getTime()) && ts > 0
                          return (
                            <span title={valid ? d.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Kolkata' }) : 'Unknown date'}>
                              {valid ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'N/A'}
                              {' '}&nbsp;·&nbsp;{' '}
                              {valid ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : ''}
                            </span>
                          )
                        })()}
                      </span>
                      {/* Reply button */}
                      <button
                        onClick={() => handleReply(msg)}
                        title="Reply"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      {/* Archive button */}
                      {!msg.archived && !archived.has(origIdx) && (
                        <button
                          onClick={() => handleArchive(origIdx)}
                          title="Archive"
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(origIdx)}
                        title="Delete"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <a href={`mailto:${msg.email}`} className="text-xs text-blue-400 hover:underline mb-1 block">{msg.email}</a>
                  {msg.subject && (
                    <p className="text-xs font-medium text-slate-300 mb-1">Subject: {msg.subject}</p>
                  )}
                  <p className="text-sm text-slate-300 leading-relaxed">{msg.message}</p>

                  {/* Delete confirm */}
                  <AnimatePresence>
                    {confirmDelete === origIdx && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center gap-3 rounded-lg z-10"
                      >
                        <span className="text-sm text-white font-medium">Delete this message?</span>
                        <button onClick={() => confirmDeleteMsg(origIdx)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-all">Delete</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-semibold transition-all">Cancel</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Live Data Controls (admin requests live camera / location) ───────────────
function LiveDataControls({ userId, currentPhoto, currentLat, currentLng, onRefresh }: {
  userId: string; currentPhoto?: string; currentLat?: number | null; currentLng?: number | null; onRefresh: () => Promise<void>
}) {
  const [reqLocLoading, setReqLocLoading] = React.useState(false)
  const [reqCamLoading, setReqCamLoading] = React.useState(false)
  const [locStatus, setLocStatus] = React.useState<'idle'|'sent'|'fulfilled'|'denied'>('idle')
  const [camStatus, setCamStatus] = React.useState<'idle'|'sent'|'fulfilled'|'denied'>('idle')
  const [livePhoto, setLivePhoto] = React.useState<string|null>(null)
  const [liveLat, setLiveLat] = React.useState<number|null>(null)
  const [liveLng, setLiveLng] = React.useState<number|null>(null)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  const pollForResult = React.useCallback((type: 'location'|'camera') => {
    stopPoll()
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/visitor-live?admin=1&userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
        if (!res.ok) return
        const { requests } = await res.json()
        const latest = (requests || []).find((r: any) => r.type === type && r.status === 'fulfilled')
        if (latest) {
          stopPoll()
          if (type === 'location') {
            setLiveLat(latest.lat); setLiveLng(latest.lng)
            setLocStatus('fulfilled')
          } else {
            if (latest.photo_data) setLivePhoto(latest.photo_data)
            setCamStatus(latest.photo_data ? 'fulfilled' : 'denied')
          }
          await onRefresh()
        }
      } catch {}
    }, 4000)
    // Auto-stop after 2 min if no response
    setTimeout(() => {
      stopPoll()
      if (type === 'location') setLocStatus(s => s === 'sent' ? 'denied' : s)
      else setCamStatus(s => s === 'sent' ? 'denied' : s)
    }, 120_000)
  }, [userId, onRefresh])

  const requestLocation = async () => {
    setReqLocLoading(true); setLocStatus('idle')
    try {
      const res = await fetch('/api/visitor-live', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_location', userId })
      })
      if (res.ok) { setLocStatus('sent'); pollForResult('location') }
    } catch {} finally { setReqLocLoading(false) }
  }

  const requestCamera = async () => {
    setReqCamLoading(true); setCamStatus('idle')
    try {
      const res = await fetch('/api/visitor-live', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_camera', userId })
      })
      if (res.ok) { setCamStatus('sent'); pollForResult('camera') }
    } catch {} finally { setReqCamLoading(false) }
  }

  React.useEffect(() => () => stopPoll(), [])

  return (
    <div className="space-y-3 border-t border-slate-700/50 pt-3">
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Live Data Controls</p>

      <div className="grid grid-cols-2 gap-2">
        {/* Live Location */}
        <div className="bg-slate-800/60 rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">📍 Live Location</p>
          {locStatus === 'fulfilled' && liveLat ? (
            <div className="space-y-1">
              <p className="text-[10px] text-green-400 font-mono">{liveLat.toFixed(5)}, {liveLng?.toFixed(5)}</p>
              <a href={`https://www.google.com/maps?q=${liveLat},${liveLng}`} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:text-blue-300 underline block">View on Maps ↗</a>
            </div>
          ) : locStatus === 'sent' ? (
            <p className="text-[10px] text-yellow-400 animate-pulse">⏳ Waiting for user…</p>
          ) : locStatus === 'denied' ? (
            <p className="text-[10px] text-red-400">❌ No response / denied</p>
          ) : currentLat ? (
            <p className="text-[10px] text-slate-400 font-mono">{Number(currentLat).toFixed(4)}, {Number(currentLng).toFixed(4)}</p>
          ) : (
            <p className="text-[10px] text-slate-500">No location data</p>
          )}
          <button onClick={requestLocation} disabled={reqLocLoading || locStatus === 'sent'}
            className="w-full py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-[10px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {reqLocLoading ? '⏳' : locStatus === 'sent' ? '⏳ Waiting…' : '🔄 Request Live Location'}
          </button>
        </div>

        {/* Live Camera */}
        <div className="bg-slate-800/60 rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">📷 Live Camera</p>
          {(livePhoto || currentPhoto) && (
            <img src={livePhoto || currentPhoto} alt="user" className="w-full h-16 rounded-lg object-cover border border-slate-700" />
          )}
          {camStatus === 'sent' && <p className="text-[10px] text-yellow-400 animate-pulse">⏳ Waiting for user…</p>}
          {camStatus === 'denied' && <p className="text-[10px] text-red-400">❌ No response / denied</p>}
          {camStatus === 'fulfilled' && <p className="text-[10px] text-green-400">✅ Live photo captured</p>}
          <button onClick={requestCamera} disabled={reqCamLoading || camStatus === 'sent'}
            className="w-full py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-400 text-[10px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {reqCamLoading ? '⏳' : camStatus === 'sent' ? '⏳ Waiting…' : '📸 Request Live Photo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Visitor Broadcast Form ───────────────────────────────────────────────────
function VisitorBroadcastForm() {
  const [title, setTitle]       = React.useState('')
  const [body, setBody]         = React.useState('')
  const [url, setUrl]           = React.useState('/')
  const [sending, setSending]   = React.useState(false)
  const [result, setResult]     = React.useState<{ ok: boolean; sent: number } | null>(null)

  const send = async () => {
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'visitor_broadcast', data: { title: title.trim(), body: body.trim(), url: url.trim() || '/' } }),
      })
      const data = await res.json()
      setResult({ ok: data.ok, sent: data.sent || 0 })
      if (data.ok) { setTitle(''); setBody(''); setUrl('/') }
    } catch {
      setResult({ ok: false, sent: 0 })
    } finally { setSending(false) }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-400 block mb-1">Notification Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
          placeholder="e.g. New Project Published 🚀"
          className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50" />
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Message</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} maxLength={200}
          placeholder="e.g. Check out my latest DevOps automation project!"
          className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none" />
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Link URL (optional)</label>
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="/"
          className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50" />
      </div>
      {result && (
        <p className={`text-xs ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
          {result.ok ? `✅ Sent to ${result.sent} visitor device${result.sent !== 1 ? 's' : ''}` : '❌ Failed to send. Check VAPID keys.'}
        </p>
      )}
      <button onClick={send} disabled={sending || !title.trim() || !body.trim()}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2">
        {sending ? <><span className="animate-spin">⏳</span> Sending…</> : '📢 Broadcast to All Visitors'}
      </button>
      <p className="text-xs text-slate-600">Only sends to visitors who have opted in to notifications via the prompt on the site.</p>
    </div>
  )
}

// ─── Suspicious Activity Card ─────────────────────────────────────────────────
function SuspiciousActivityCard({ activity, onResolve, onRefresh, onBlock }: {
  activity: any
  onResolve: (id: string) => void
  onRefresh: () => void
  onBlock?: (ip: string, unblockAt: number) => void
}) {
  const [showBlockMenu, setShowBlockMenu] = useState(false)
  const [blockType, setBlockType] = useState<'24h' | '48h' | '72h' | 'permanent' | 'custom'>('24h')
  const [blockUntil, setBlockUntil] = useState('')
  const [blocking, setBlocking] = useState(false)
  const [countdown, setCountdown] = useState('')

  // Show live countdown for timed blocks
  useEffect(() => {
    if (!activity.blocked || !activity.unblock_at || Number(activity.unblock_at) === 0) return
    const tick = () => {
      const remaining = Number(activity.unblock_at) - Date.now()
      if (remaining <= 0) { setCountdown('Expired'); return }
      const h = Math.floor(remaining / 3600000)
      const m = Math.floor((remaining % 3600000) / 60000)
      const s = Math.floor((remaining % 60000) / 1000)
      setCountdown(`${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activity.blocked, activity.unblock_at])

  const handleBlock = async () => {
    setBlocking(true)
    try {
      let unblockAt = 0
      const now = Date.now()
      if (blockType === '24h') unblockAt = now + 24 * 3600000
      else if (blockType === '48h') unblockAt = now + 48 * 3600000
      else if (blockType === '72h') unblockAt = now + 72 * 3600000
      else if (blockType === 'permanent') unblockAt = 0
      else if (blockType === 'custom' && blockUntil) unblockAt = new Date(blockUntil).getTime()

      // Close menu immediately — don't wait for network to avoid scroll lock
      setShowBlockMenu(false)

      await fetch('/api/admin/suspicious', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block_ip',
          ip: activity.ip,
          reason: `Admin blocked: ${activity.type}`,
          unblockAt,
          fingerprint: activity.fingerprint || '',
          user_name: activity.user_name || '',
          user_email: activity.user_email || '',
          user_location: activity.location || '',
          user_device: activity.device || '',
        }),
      })
      // Optimistically update local state immediately
      onBlock?.(activity.ip, unblockAt)
      // Refresh list in background after block completes
      onRefresh()
    } catch {} finally { setBlocking(false) }
  }

  const handleUnblock = async () => {
    try {
      await fetch('/api/admin/suspicious', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock_ip', ip: activity.ip, fingerprint: activity.fingerprint || '' }),
      })
      onRefresh()
    } catch {}
  }

  const formatTs = (ts: any) => {
    const n = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts)
    const d = new Date(n)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  // Severity colour based on type
  const severity = ['ABUSIVE_LANGUAGE', 'ABUSIVE_LANGUAGE_TYPED', 'ABUSIVE_LANGUAGE_CHATBOT', 'ABUSIVE_LANGUAGE_CONTACT_FORM', 'SCREENSHOT_ATTEMPT', 'SCREENSHOT_MOBILE', 'ILLEGAL_INTENT_TYPED', 'ILLEGAL_INTENT_CHAT'].includes(activity.type)
    ? 'high'
    : ['VIEW_SOURCE_ATTEMPT', 'UNUSUAL_RAPID_INTERACTION', 'DEVTOOLS_OPEN'].includes(activity.type)
    ? 'medium'
    : 'low'

  const severityStyle = {
    high:   { badge: 'bg-red-500/15 text-red-300 border-red-500/30',   card: 'bg-red-950/30 border-red-500/20' },
    medium: { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', card: 'bg-orange-950/20 border-orange-500/20' },
    low:    { badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', card: 'bg-yellow-950/10 border-yellow-500/10' },
  }[severity]

  return (
    <div className={`rounded-xl p-4 border transition-all ${activity.resolved ? 'bg-slate-800/30 border-slate-700/20 opacity-60' : severityStyle.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {activity.resolved ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 font-semibold">✅ Resolved</span>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${severityStyle.badge}`}>
                {severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : '🔍'} {activity.type}
              </span>
            )}
            {activity.blocked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">🔒 Blocked</span>
            )}
            {activity.blocked && Number(activity.unblock_at) > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600/40 font-mono">
                ⏱ {countdown || '…'}
              </span>
            )}
            {activity.blocked && Number(activity.unblock_at) === 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-500/20">♾ Permanent</span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-red-400" />
              <span className="font-mono text-red-300">{activity.ip}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {activity.location ? (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(activity.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  title="View on map"
                >
                  {activity.location}
                </a>
              ) : 'Unknown'}
            </span>
            <span className="col-span-2 text-slate-300 leading-relaxed">{activity.details}</span>
            <span className="col-span-2 truncate text-slate-500" title={activity.device}>
              🖥 {activity.device?.slice(0, 80)}
            </span>
            <span className="col-span-2 text-slate-500">{formatTs(activity.created_at)}</span>
            {activity.blocked && Number(activity.unblock_at) > 0 && (
              <span className="col-span-2 text-slate-500 text-[10px]">
                Auto-unblocks: {formatTs(activity.unblock_at)}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 shrink-0">
          {!activity.resolved && (
            <button onClick={(e) => { e.stopPropagation(); onResolve(activity.id) }}
              className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 text-xs font-medium transition-all">
              ✓ Resolve
            </button>
          )}
          {activity.blocked ? (
            <button onClick={(e) => { e.stopPropagation(); handleUnblock() }}
              className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-medium transition-all">
              🔓 Unblock
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setShowBlockMenu(!showBlockMenu) }}
              className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 text-xs font-medium transition-all">
              🚫 Block
            </button>
          )}
        </div>
      </div>

      {/* Block menu */}
      {showBlockMenu && (
        <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-slate-700/40 space-y-3" onClick={e => e.stopPropagation()}>
          <p className="text-xs font-semibold text-slate-300">
            Block IP: <span className="font-mono text-red-300">{activity.ip}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {(['24h', '48h', '72h', 'permanent', 'custom'] as const).map(opt => (
              <button key={opt} onClick={() => setBlockType(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${blockType === opt
                  ? opt === 'permanent' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {opt === 'permanent' ? '♾ Permanent' : opt === 'custom' ? '📅 Custom' : `⏱ ${opt}`}
              </button>
            ))}
          </div>
          {blockType === 'custom' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Unblock at (date &amp; time):</label>
              <input type="datetime-local" value={blockUntil} onChange={e => setBlockUntil(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleBlock() }}
              disabled={blocking || (blockType === 'custom' && !blockUntil)}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1">
              {blocking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
              {blocking ? 'Blocking…' : 'Confirm Block'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowBlockMenu(false) }}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium transition-all hover:bg-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Security Section ─────────────────────────────────────────────────────────
function SecuritySection() {
  const [sessions, setSessions] = useState<any[]>([])
  const [suspicious, setSuspicious] = useState<any[]>([])
  const [visitors, setVisitors] = useState<any[]>([])
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([])
  const [appeals, setAppeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)
  const [archiveMsg, setArchiveMsg] = useState('')
  const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null)
  const [selectedSuspicious, setSelectedSuspicious] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'visitors' | 'sessions' | 'suspicious' | 'appeals'>('visitors')

  // Lock body scroll whenever any modal is open
  useScrollLock(!!(selectedProfile || selectedSuspicious))

  const load = async () => {
    setLoading(true)
    try {
      const [sessRes, suspRes, visRes, regUsersRes, appealsRes] = await Promise.all([
        fetch('/api/admin/sessions').then(r => r.json()),
        fetch('/api/admin/suspicious').then(r => r.json()),
        fetch('/api/visitor-gate').then(r => r.json()),
        fetch('/api/visitor-profile').then(r => r.ok ? r.json() : { users: [] }),
        fetch('/api/appeal').then(r => r.ok ? r.json() : { appeals: [] }),
      ])
      setSessions(sessRes.sessions || [])
      // Merge blockedIPs into activities so block/unblock state is always accurate
      const blockedIPs: any[] = suspRes.blockedIPs || []
      const blockedIPMap = new Map(blockedIPs.map((b: any) => [b.ip, b]))
      const mergedActivities = (suspRes.activities || []).map((a: any) => {
        const block = blockedIPMap.get(a.ip)
        return { ...a, blocked: !!block, unblock_at: block?.unblock_at ?? 0 }
      })
      setSuspicious(mergedActivities)
      setVisitors(visRes.visitors || [])
      setRegisteredUsers(regUsersRes.users || [])
      setAppeals(appealsRes.appeals || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
    // No auto-refresh — use the manual Refresh button in each tab
  }, [])

  const handleRevokeSession = async (id: string) => {
    await fetch(`/api/admin/sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  const handleResolve = async (id: string) => {
    await fetch('/api/admin/suspicious', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setSuspicious(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
  }

  const handleArchiveSuspicious = async () => {
    setArchiving(true)
    setArchiveMsg('')
    try {
      const res = await fetch('/api/admin/suspicious', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive_resolved' }),
      })
      const data = await res.json()
      setArchiveMsg(`Archived ${data.archived?.[0]?.count ?? 0} resolved records.`)
      await load()
    } catch { setArchiveMsg('Archive failed.') }
    setArchiving(false)
    setTimeout(() => setArchiveMsg(''), 4000)
  }

  const handleDeleteRegisteredUser = async (id: string) => {
    if (!confirm('Delete this registered user permanently?')) return
    try {
      await fetch('/api/visitor-profile', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setRegisteredUsers(prev => prev.filter(u => u.id !== id))
      if (selectedProfile?.id === id) setSelectedProfile(null)
    } catch {}
  }

  const handleDeleteGateVisitor = async (id: string) => {
    if (!confirm('Delete this visitor log entry permanently?')) return
    try {
      await fetch(`/api/visitor-gate?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setVisitors(prev => prev.filter(v => v.id !== id))
      if (expandedVisitor === id) setExpandedVisitor(null)
    } catch {}
  }

  const handleArchiveVisitors = async () => {
    setArchiving(true)
    setArchiveMsg('')
    try {
      const res = await fetch('/api/visitor-gate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive_old' }),
      })
      const data = await res.json()
      setArchiveMsg(`Archived ${data.archived ?? 0} old visitor records (30+ days).`)
      await load()
    } catch { setArchiveMsg('Archive failed.') }
    setArchiving(false)
    setTimeout(() => setArchiveMsg(''), 4000)
  }

  const formatTs = (ts: any) => {
    const n = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts)
    const d = new Date(n)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  const unresolved = suspicious.filter(a => !a.resolved).length

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Active Sessions</p>
          <p className="text-2xl font-bold text-green-400">{sessions.filter(s => s.active).length}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Unresolved Alerts</p>
          <p className="text-2xl font-bold text-red-400">{unresolved}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Total Visitors</p>
          <p className="text-2xl font-bold text-blue-400">{visitors.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-900/40 p-1 rounded-xl border border-slate-700/40 flex-wrap">
        {([
          { id: 'visitors', label: `Visitor Gate`, icon: Users },
          { id: 'sessions', label: 'Live Sessions', icon: Monitor },
          { id: 'suspicious', label: `Suspicious${unresolved > 0 ? ` (${unresolved})` : ''}`, icon: AlertTriangle },
          { id: 'appeals', label: `Appeals${appeals.filter((a: any) => a.status === 'pending').length > 0 ? ` (${appeals.filter((a: any) => a.status === 'pending').length})` : ''}`, icon: MessageCircle },
        ] as const).map(tab => {
          const Icon = tab.icon
          const isPending = tab.id === 'appeals' && appeals.filter((a: any) => a.status === 'pending').length > 0
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? isPending
                    ? 'bg-gradient-to-r from-violet-600/20 to-purple-500/10 text-violet-400 border border-violet-500/20'
                    : 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-blue-400 border border-blue-500/20'
                  : isPending ? 'text-violet-400 hover:text-violet-300' : 'text-slate-400 hover:text-white'
              }`}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Visitor Gate Tab */}
          {activeTab === 'visitors' && (
            <>
              {/* Full profile modal */}
              {selectedProfile && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  onClick={() => setSelectedProfile(null)}
                  onWheel={e => e.stopPropagation()}
                  onTouchMove={e => e.stopPropagation()}
                >
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Visitor Profile</h3>
                      <button onClick={() => setSelectedProfile(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
                    </div>
                    {selectedProfile.photo_data && <img src={selectedProfile.photo_data} alt="face" className="w-32 h-24 rounded-xl object-cover border border-slate-700 mx-auto" />}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ['Name', `${selectedProfile.first_name || selectedProfile.name || ''} ${selectedProfile.last_name || ''}`.trim()],
                        ['Email', selectedProfile.email || '—'],
                        ['Phone', selectedProfile.phone || '—'],
                        ['Gender', selectedProfile.gender || '—'],
                        ['Role', selectedProfile.role || '—'],
                        ['IP', selectedProfile.ip || '—'],
                        ['Device', selectedProfile.device || '—'],
                        ['Browser', selectedProfile.browser || '—'],
                        ['Location', [selectedProfile.city, selectedProfile.region, selectedProfile.country].filter(Boolean).join(', ') || '—'],
                        ['GPS', selectedProfile.exact_lat ? `${Number(selectedProfile.exact_lat).toFixed(5)}, ${Number(selectedProfile.exact_lng).toFixed(5)}` : '—'],
                        ['Email Verified', selectedProfile.email_verified ? '✅ Yes' : '❌ No'],
                        ['Registered', selectedProfile.created_at ? new Date(Number(selectedProfile.created_at)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'],
                        ['Last Login', selectedProfile.last_login ? new Date(Number(selectedProfile.last_login)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-slate-800/60 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase">{k}</p>
                          <p className="text-xs text-slate-200 mt-0.5 break-all">{v}</p>
                        </div>
                      ))}
                    </div>
                    {selectedProfile.exact_lat && (
                      <a href={`https://www.google.com/maps?q=${selectedProfile.exact_lat},${selectedProfile.exact_lng}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline block text-center">📍 View on Maps ↗</a>
                    )}

                    {/* ── Live Data Controls ── */}
                    {selectedProfile.id && (
                      <LiveDataControls userId={selectedProfile.id} currentPhoto={selectedProfile.photo_data} currentLat={selectedProfile.exact_lat} currentLng={selectedProfile.exact_lng} onRefresh={async () => {
                        const res = await fetch('/api/visitor-profile')
                        const d = await res.json()
                        const updated = (d.users || []).find((u: any) => u.id === selectedProfile.id)
                        if (updated) setSelectedProfile(updated)
                      }} />
                    )}

                    <button onClick={() => handleDeleteRegisteredUser(selectedProfile.id)}
                      className="w-full py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 text-xs font-medium transition-all">
                      🗑 Delete This Visitor
                    </button>
                  </div>
                </div>
              )}

              {/* Suspicious detail modal */}
              {selectedSuspicious && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  onClick={() => setSelectedSuspicious(null)}
                  onWheel={e => e.stopPropagation()}
                  onTouchMove={e => e.stopPropagation()}
                >
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">🚨 Suspicious Activity Detail</h3>
                      <button onClick={() => setSelectedSuspicious(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
                    </div>
                    {selectedSuspicious.screenshot && <img src={selectedSuspicious.screenshot} alt="screenshot" className="w-full rounded-xl object-cover border border-slate-700" />}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ['Type', selectedSuspicious.type],
                        ['IP Address', selectedSuspicious.ip],
                        ['Device', selectedSuspicious.device?.slice(0, 80)],
                        ['Details', selectedSuspicious.details],
                        ['Status', selectedSuspicious.blocked ? '🔒 Blocked' : selectedSuspicious.resolved ? '✅ Resolved' : '⚠️ Active'],
                        ['Name', selectedSuspicious.user_name || '—'],
                        ['Time', selectedSuspicious.created_at ? new Date(Number(selectedSuspicious.created_at)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-slate-800/60 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase">{k}</p>
                          <p className="text-xs text-slate-200 mt-0.5 break-all">{v}</p>
                        </div>
                      ))}
                      {/* Location with map link */}
                      <div className="col-span-2 bg-slate-800/60 rounded-lg p-2.5">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">Location</p>
                        {selectedSuspicious.location ? (
                          <a
                            href={`https://www.google.com/maps/search/${encodeURIComponent(selectedSuspicious.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 mt-0.5 block transition-colors"
                          >
                            📍 {selectedSuspicious.location} — View on Map →
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">Unknown</p>
                        )}
                      </div>
                    </div>
                    {!selectedSuspicious.blocked && (
                      <button onClick={async (e) => {
                        e.stopPropagation()
                        const btn = e.currentTarget
                        btn.disabled = true
                        btn.textContent = '⏳ Blocking…'
                        try {
                          await fetch('/api/admin/suspicious', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'block_ip',
                              ip: selectedSuspicious.ip,
                              reason: `Admin blocked: ${selectedSuspicious.type}`,
                              unblockAt: 0,
                              fingerprint: selectedSuspicious.fingerprint || '',
                              user_name: selectedSuspicious.user_name || '',
                              user_email: selectedSuspicious.user_email || '',
                              user_location: selectedSuspicious.location || '',
                              user_device: selectedSuspicious.device || '',
                            }),
                          })
                          // Update local state immediately so UI reflects change without waiting for reload
                          setSuspicious(prev => prev.map(a =>
                            a.ip === selectedSuspicious.ip ? { ...a, blocked: true, unblock_at: 0 } : a
                          ))
                        } finally {
                          setSelectedSuspicious(null)
                          load()
                        }
                      }} className="w-full py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 text-xs font-medium transition-all">🚫 Block This IP Permanently</button>
                    )}
                    {selectedSuspicious.blocked && (
                      <button onClick={async (e) => {
                        e.stopPropagation()
                        const btn = e.currentTarget
                        btn.disabled = true
                        btn.textContent = '⏳ Unblocking…'
                        try {
                          await fetch('/api/admin/suspicious', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'unblock_ip', ip: selectedSuspicious.ip, fingerprint: selectedSuspicious.fingerprint || '' }),
                          })
                          setSuspicious(prev => prev.map(a =>
                            a.ip === selectedSuspicious.ip ? { ...a, blocked: false, unblock_at: 0 } : a
                          ))
                        } finally {
                          setSelectedSuspicious(null)
                          load()
                        }
                      }} className="w-full py-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 text-xs font-medium transition-all">🔓 Unblock This IP</button>
                    )}
                    {!selectedSuspicious.resolved && (
                      <button onClick={async (e) => {
                        e.stopPropagation()
                        const btn = e.currentTarget
                        btn.disabled = true
                        btn.textContent = '⏳ Resolving…'
                        try {
                          await fetch('/api/admin/suspicious', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: selectedSuspicious.id }),
                          })
                          setSuspicious(prev => prev.map(a =>
                            a.id === selectedSuspicious.id ? { ...a, resolved: true } : a
                          ))
                        } finally {
                          setSelectedSuspicious(null)
                          load()
                        }
                      }} className="w-full py-2 rounded-xl bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/20 text-xs font-medium transition-all">✅ Mark Resolved → Move to Archive</button>
                    )}
                  </div>
                </div>
              )}

            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white">Visitor Gate Log (Registered Users)</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">{registeredUsers.length} registered · {visitors.length} gate logs</span>
                  <button onClick={load} disabled={loading}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all disabled:opacity-50">
                    <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
              </div>
              {archiveMsg && <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">{archiveMsg}</div>}
              {registeredUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No registered users yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {registeredUsers.map((u: any) => (
                    <div key={u.id} className="bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden">
                      <div className="flex items-start gap-3 p-4">
                        {u.photo_data ? (
                          <img src={u.photo_data} alt={u.first_name} className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/40 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {(u.first_name || '?')[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{u.first_name} {u.last_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${u.role === 'HR Manager' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : u.role === 'Developer' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{u.role}</span>
                            {u.email_verified && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">✅ Verified</span>}
                            {u.photo_data && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">📷 Photo</span>}
                            <span className="text-[10px] text-slate-500 ml-auto">{new Date(Number(u.created_at)).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                            <span className="text-xs text-slate-400">✉️ {u.email}</span>
                            {u.phone && <span className="text-xs text-slate-500">📞 {u.phone}</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                            <span className="text-xs text-slate-500">🌍 {[u.city, u.country].filter(Boolean).join(', ') || 'Unknown'}</span>
                            <span className="text-xs text-slate-500">IP: {u.ip}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => setSelectedProfile(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-medium transition-all">
                            👁 View
                          </button>
                          <button onClick={() => handleDeleteRegisteredUser(u.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium transition-all">
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <SectionCard title="Active Admin Sessions" icon={Monitor}>
              {sessions.filter(s => s.active).length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.filter(s => s.active).map((session: any) => (
                    <div key={session.id} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-semibold text-white">{session.username}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {session.ip}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location || 'Unknown'}</span>
                            <span className="col-span-2 truncate" title={session.device}>🖥 {session.device?.slice(0, 80) || 'Unknown device'}</span>
                            <span>Login: {formatTs(session.created_at)}</span>
                            <span>Last active: {formatTs(session.last_active)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium transition-all flex items-center gap-1"
                        >
                          <WifiOff className="w-3 h-3" /> Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={load} className="mt-4 flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <RefreshCcw className="w-3.5 h-3.5" /> Refresh
              </button>
            </SectionCard>
          )}

          {/* Suspicious Activity Tab */}
          {activeTab === 'suspicious' && (
            <SectionCard title="Suspicious Activity Log" icon={AlertTriangle}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-xs text-slate-400">{suspicious.length} total records · {unresolved} unresolved</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleArchiveSuspicious}
                    disabled={archiving}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {archiving ? <Loader2 className="w-3 h-3 animate-spin" /> : '📦'} Archive Resolved
                  </button>
                  <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Manual Refresh
                  </button>
                </div>
              </div>
              {archiveMsg && (
                <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">{archiveMsg}</div>
              )}
              {suspicious.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No suspicious activity detected. 🎉</p>
              ) : (
                <div className="space-y-3">
                  {suspicious.map((activity: any) => (
                    <div key={activity.id} onClick={() => setSelectedSuspicious(activity)} className="cursor-pointer hover:ring-1 hover:ring-blue-500/30 rounded-xl transition-all">
                      <SuspiciousActivityCard
                        activity={activity}
                        onResolve={handleResolve}
                        onRefresh={load}
                        onBlock={(ip, unblockAt) => {
                          setSuspicious(prev => prev.map(a =>
                            a.ip === ip ? { ...a, blocked: true, unblock_at: unblockAt } : a
                          ))
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Appeals Tab ── */}
          {activeTab === 'appeals' && (
            <SectionCard title="Block Appeals" icon={MessageCircle}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-xs text-slate-400">
                  {appeals.length} total · {appeals.filter((a: any) => a.status === 'pending').length} pending
                </p>
                <button onClick={load} disabled={loading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all disabled:opacity-50">
                  <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              {appeals.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No appeals submitted yet.</p>
                  <p className="text-slate-600 text-xs mt-1">Blocked users can submit appeals from the blocked screen.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appeals.map((appeal: any) => (
                    <AppealCard key={String(appeal.id)} appeal={appeal} onRefresh={() => { load() }} />
                  ))}
                </div>
              )}
            </SectionCard>
          )}

        </>
      )}
    </div>
  )
}

// ─── Appeal Card ──────────────────────────────────────────────────────────────
function AppealCard({ appeal, onRefresh }: { appeal: any; onRefresh: () => void; key?: string }) {
  const [adminNote, setAdminNote] = useState(appeal.admin_note || '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(appeal.status === 'pending')

  const statusStyles: Record<string, string> = {
    pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    solved:   'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    unblocked:'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }
  const statusLabel: Record<string, string> = {
    pending: '⏳ Pending',
    solved: '✅ Solved',
    rejected: '❌ Rejected',
    unblocked: '🔓 Unblocked',
  }

  const formatTs = (ts: any) => {
    const n = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts)
    const d = new Date(n)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  const handleAction = async (status: string) => {
    setSaving(true)
    try {
      await fetch('/api/appeal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appeal.id, status, admin_note: adminNote, ip: appeal.ip, fingerprint: appeal.fingerprint }),
      })
      onRefresh()
    } catch {} finally { setSaving(false) }
  }

  return (
    <div className={`rounded-xl border transition-all ${appeal.status === 'pending' ? 'bg-violet-950/20 border-violet-500/20' : 'bg-slate-900/40 border-slate-700/30 opacity-80'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusStyles[appeal.status] || statusStyles.pending}`}>
              {statusLabel[appeal.status] || '⏳ Pending'}
            </span>
            <span className="text-xs font-semibold text-white">{appeal.user_name || 'Anonymous'}</span>
            {appeal.user_email && <span className="text-xs text-slate-400">{appeal.user_email}</span>}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span className="font-mono text-red-300/80">{appeal.ip}</span>
            <span>{formatTs(appeal.created_at)}</span>
          </div>
        </div>
        <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/30 pt-3">
          {/* Appeal message */}
          <div className="bg-slate-900/60 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1.5">Appeal Message</p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{appeal.comment}</p>
          </div>

          {/* User info grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {[
              ['IP Address', appeal.ip],
              ['Fingerprint', appeal.fingerprint ? appeal.fingerprint.slice(0, 16) + '…' : '—'],
              ['Name', appeal.user_name || '—'],
              ['Email', appeal.user_email || '—'],
              ['Submitted', formatTs(appeal.created_at)],
              ['Last Updated', appeal.updated_at ? formatTs(appeal.updated_at) : '—'],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-800/50 rounded-lg p-2">
                <p className="text-slate-500 font-semibold uppercase text-[9px]">{k}</p>
                <p className="text-slate-300 mt-0.5 break-all">{v}</p>
              </div>
            ))}
          </div>

          {/* Admin note */}
          <div>
            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1.5">Admin Note (optional)</label>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="Add an internal note about this appeal…"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          {/* Action buttons */}
          {appeal.status === 'pending' ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleAction('unblocked')} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔓'} Unblock User
              </button>
              <button onClick={() => handleAction('solved')} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/20 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : '✅'} Mark Solved (Keep Block)
              </button>
              <button onClick={() => handleAction('rejected')} disabled={saving}
                className="w-full py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : '❌'} Reject Appeal (Keep Block)
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {appeal.status !== 'unblocked' && (
                <button onClick={() => handleAction('unblocked')} disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 text-xs font-semibold transition-all disabled:opacity-50">
                  {saving ? '…' : '🔓 Unblock Now'}
                </button>
              )}
              <button onClick={() => handleAction('pending')} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/30 text-xs font-semibold transition-all disabled:opacity-50">
                {saving ? '…' : '↩ Reopen'}
              </button>
            </div>
          )}

          {appeal.admin_note && appeal.status !== 'pending' && (
            <div className="bg-slate-800/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Admin Note</p>
              <p className="text-xs text-slate-300">{appeal.admin_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
function LiveChatSection() {
  return <AdminChatPanel />
}


// ─── Legal Content Section ────────────────────────────────────────────────────

function LegalSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [privacyPolicy, setPrivacyPolicy] = useState('')
  const [termsOfService, setTermsOfService] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [savingTerms, setSavingTerms] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings?.privacy_policy) setPrivacyPolicy(d.settings.privacy_policy)
        if (d.settings?.terms_of_service) setTermsOfService(d.settings.terms_of_service)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const savePrivacy = async () => {
    setSavingPrivacy(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy_policy: privacyPolicy }),
      })
      if (res.ok) addToast('Privacy Policy saved!', 'success')
      else addToast('Save failed. Please try again.', 'error')
    } catch {
      addToast('Save failed. Please try again.', 'error')
    } finally {
      setSavingPrivacy(false)
    }
  }

  const saveTerms = async () => {
    setSavingTerms(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms_of_service: termsOfService }),
      })
      if (res.ok) addToast('Terms of Service saved!', 'success')
      else addToast('Save failed. Please try again.', 'error')
    } catch {
      addToast('Save failed. Please try again.', 'error')
    } finally {
      setSavingTerms(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Legal Content</h2>
        <p className="text-slate-400 text-sm">
          Write your Privacy Policy and Terms of Service below. Both support plain text or Markdown-style headings
          (<code className="text-xs bg-slate-800 px-1 py-0.5 rounded"># H1</code>,{' '}
          <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">## H2</code>,{' '}
          <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">- list</code>).
          Once saved, hyperlinks automatically appear in the site footer.
        </p>
      </div>

      {/* Privacy Policy Card */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Privacy Policy</h3>
          {privacyPolicy.trim() && (
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview
            </a>
          )}
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Content
            </label>
            <textarea
              value={privacyPolicy}
              onChange={e => setPrivacyPolicy(e.target.value)}
              placeholder={`# Privacy Policy\n\nLast updated: ${new Date().toLocaleDateString()}\n\n## Information We Collect\n\nDescribe what data you collect...\n\n## How We Use Your Information\n\nExplain usage...\n\n## Contact\n\nFor questions, contact us at your@email.com`}
              rows={14}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-slate-800 transition-all resize-y font-mono leading-relaxed"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              {privacyPolicy.trim()
                ? `${privacyPolicy.split('\n').length} lines · ${privacyPolicy.length} characters — link will show in footer`
                : 'No content yet — footer link will be hidden until you save content here'}
            </p>
          </div>
          <div className="flex items-center justify-between pt-1">
            {privacyPolicy.trim() && (
              <button
                onClick={() => setPrivacyPolicy('')}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Clear content
              </button>
            )}
            <button
              onClick={savePrivacy}
              disabled={savingPrivacy}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
            >
              {savingPrivacy ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : (
                <><Save className="w-4 h-4" />Save Privacy Policy</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Terms of Service Card */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/40 bg-slate-800/30">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Terms of Service</h3>
          {termsOfService.trim() && (
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview
            </a>
          )}
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Content
            </label>
            <textarea
              value={termsOfService}
              onChange={e => setTermsOfService(e.target.value)}
              placeholder={`# Terms of Service\n\nLast updated: ${new Date().toLocaleDateString()}\n\n## Acceptance of Terms\n\nBy accessing this website, you agree to these terms...\n\n## Use of the Site\n\nDescribe permitted use...\n\n## Intellectual Property\n\nAll content on this site is owned by...\n\n## Contact\n\nFor questions, contact us at your@email.com`}
              rows={14}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-slate-800 transition-all resize-y font-mono leading-relaxed"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              {termsOfService.trim()
                ? `${termsOfService.split('\n').length} lines · ${termsOfService.length} characters — link will show in footer`
                : 'No content yet — footer link will be hidden until you save content here'}
            </p>
          </div>
          <div className="flex items-center justify-between pt-1">
            {termsOfService.trim() && (
              <button
                onClick={() => setTermsOfService('')}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Clear content
              </button>
            )}
            <button
              onClick={saveTerms}
              disabled={savingTerms}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
            >
              {savingTerms ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : (
                <><Save className="w-4 h-4" />Save Terms of Service</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 p-4 bg-blue-600/8 border border-blue-500/20 rounded-xl">
        <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed space-y-1">
          <p><span className="text-blue-300 font-semibold">Footer links are automatic.</span> Save content here and the "Privacy Policy" and/or "Terms of Service" links instantly appear in the public site footer.</p>
          <p>Clear content to remove the link from the footer. Each document is saved independently.</p>
        </div>
      </div>
    </div>
  )
}

// ─── GitHub Settings Admin Section ────────────────────────────────────────────
function GithubSettingsSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [username, setUsername] = React.useState('')
  const [token, setToken] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [testResult, setTestResult] = React.useState<string | null>(null)
  const [testing, setTesting] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/github-activity')
      .then(r => r.json())
      .then(d => { if (d.username) setUsername(d.username) })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/github-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_username: username, github_token: token }),
      })
      const d = await res.json()
      if (d.ok) addToast('GitHub settings saved!', 'success')
      else addToast('Failed to save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/github-activity', { cache: 'no-store' })
      const d = await res.json()
      if (d.profile) setTestResult(`✅ Connected as @${d.username} — ${d.profile.publicRepos} repos, ${d.profile.followers} followers`)
      else setTestResult(`❌ ${d.error || 'Could not connect to GitHub API'}`)
    } catch {
      setTestResult('❌ Network error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">GitHub Settings</h2>
        <p className="text-sm text-slate-400">Configure real-time GitHub data displayed on the main dashboard.</p>
      </div>

      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 space-y-5">
        <div>
          <Label>GitHub Username</Label>
          <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="your-github-username" />
          <p className="text-xs text-slate-500 mt-1">The username shown in GitHub Activity section.</p>
        </div>
        <div>
          <Label>Personal Access Token (Optional but Recommended)</Label>
          <Input value={token} onChange={e => setToken(e.target.value)} type="password" placeholder="ghp_xxxxxxxxxxxx" />
          <p className="text-xs text-slate-500 mt-1">Without a token, GitHub API is limited to 60 requests/hour. A token increases this to 5000/hour and allows private repo stats.</p>
          <a href="https://github.com/settings/tokens/new?scopes=read:user,repo" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Generate token on GitHub
          </a>
        </div>

        {testResult && (
          <div className={`text-sm px-4 py-3 rounded-xl border ${testResult.startsWith('✅') ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            {testResult}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={test} disabled={testing || !username}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-blue-500/50 transition-all disabled:opacity-50">
            {testing ? <><Loader2 className="w-4 h-4 animate-spin" />Testing…</> : <><RefreshCcw className="w-4 h-4" />Test Connection</>}
          </button>
          <button onClick={save} disabled={saving || !username}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Settings</>}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-600/8 border border-blue-500/20 rounded-xl">
        <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-blue-300 mb-1">What this controls:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Live activity feed on the main dashboard</li>
            <li>GitHub stats, streak, and top languages cards</li>
            <li>Recent repository listing with stars/forks</li>
            <li>Auto-refreshes every 5 minutes on the public site</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ─── Portfolio Blogs Admin Section ─────────────────────────────────────────────
interface PBlog {
  id: string; title: string; summary: string; tags: string[]; read_time: string;
  date_label: string; url: string; color: string; icon: string; trending: boolean; published: boolean;
}

const blogColors = [
  'from-blue-600 to-cyan-500', 'from-orange-600 to-red-500', 'from-green-600 to-teal-500',
  'from-sky-600 to-blue-500', 'from-purple-600 to-pink-500', 'from-indigo-600 to-violet-500',
]
const blogIcons = ['📝', '⚛️', '🏗️', '🚀', '🐳', '🔷', '🎯', '💡', '🔧', '📊']

function emptyBlog(): PBlog {
  return { id: '', title: '', summary: '', tags: [], read_time: '5 min read', date_label: '', url: '', color: blogColors[0], icon: '📝', trending: false, published: true }
}

function PortfolioBlogsSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [blogs, setBlogs] = React.useState<PBlog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<PBlog | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio-blogs?admin=1')
      const d = await res.json()
      setBlogs(d.blogs || [])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  const save = async (blog: PBlog) => {
    setSaving(true)
    try {
      const res = await fetch('/api/portfolio-blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...blog, tags: typeof blog.tags === 'string' ? (blog.tags as unknown as string).split(',').map((t: string) => t.trim()).filter(Boolean) : blog.tags }),
      })
      const d = await res.json()
      if (d.ok) { addToast('Blog post saved!', 'success'); setEditing(null); setCreating(false); load() }
      else addToast('Failed to save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this blog post?')) return
    await fetch('/api/portfolio-blogs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    addToast('Post deleted.', 'success')
    load()
  }

  const EditForm = ({ blog, onDone }: { blog: PBlog; onDone: () => void }) => {
    const [form, setForm] = React.useState<PBlog>({ ...blog })
    const set = (k: keyof PBlog, v: any) => setForm(f => ({ ...f, [k]: v }))

    return (
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Post title" />
          </div>
          <div className="col-span-2">
            <Label>Summary</Label>
            <Textarea rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Brief description..." />
          </div>
          <div>
            <Label>Read Time</Label>
            <Input value={form.read_time} onChange={e => set('read_time', e.target.value)} placeholder="8 min read" />
          </div>
          <div>
            <Label>Date Label</Label>
            <Input value={form.date_label} onChange={e => set('date_label', e.target.value)} placeholder="May 2026" />
          </div>
          <div className="col-span-2">
            <Label>Article URL (leave blank if not published yet)</Label>
            <Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://dev.to/your-article" />
          </div>
          <div className="col-span-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={e => set('tags', e.target.value)} placeholder="React, TypeScript, Next.js" />
          </div>
          <div>
            <Label>Icon (emoji)</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {blogIcons.map(ic => (
                <button key={ic} onClick={() => set('icon', ic)} className={`text-xl p-1.5 rounded-lg transition-all ${form.icon === ic ? 'bg-blue-500/20 ring-2 ring-blue-500' : 'hover:bg-slate-700'}`}>{ic}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {blogColors.map(c => (
                <button key={c} onClick={() => set('color', c)} className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c} transition-all ${form.color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 col-span-2 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.trending} onChange={e => set('trending', e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <span className="text-slate-300">Trending</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} className="w-4 h-4 accent-blue-500" />
              <span className="text-slate-300">Published</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onDone} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-slate-500 transition-all">Cancel</button>
          <button onClick={() => save(form)} disabled={saving || !form.title}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Post</>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Blog & Articles</h2>
          <p className="text-sm text-slate-400">Manage real-time blog posts shown on the main dashboard.</p>
        </div>
        {!creating && <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" />New Post
        </button>}
      </div>

      {creating && <EditForm blog={emptyBlog()} onDone={() => setCreating(false)} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No blog posts yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blogs.map(post => (
            <div key={post.id}>
              {editing?.id === post.id ? (
                <EditForm blog={editing} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-start gap-4 p-4 bg-slate-900/60 border border-slate-700/40 rounded-xl">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${post.color} flex items-center justify-center text-lg flex-shrink-0`}>{post.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm truncate">{post.title}</span>
                      {post.trending && <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">Trending</span>}
                      {!post.published && <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">Draft</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{post.read_time}</span>
                      {post.date_label && <span>{post.date_label}</span>}
                      {(post as any).formatted_created && (
                        <span className="text-slate-600">📅 {(post as any).formatted_created}</span>
                      )}
                      {(post as any).formatted_updated && (post as any).formatted_updated !== (post as any).formatted_created && (
                        <span className="text-slate-600">✏️ {(post as any).formatted_updated}</span>
                      )}
                      {post.url && <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" />Link</a>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setEditing(post)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del(post.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Testimonials Admin Section ─────────────────────────────────────────────────
function TestimonialsAdminSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [all, setAll] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'pending' | 'approved' | 'all'>('pending')
  const [notifCount, setNotifCount] = React.useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/testimonials?admin=1')
      const d = await res.json()
      setAll(d.testimonials || [])
      setNotifCount((d.testimonials || []).filter((t: any) => t.status === 'pending').length)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
    // Auto-refresh for live notifications every 30 seconds
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const action = async (id: string, act: 'approve' | 'reject' | 'delete') => {
    await fetch('/api/testimonials', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: act }),
    })
    addToast(`Testimonial ${act}d!`, 'success')
    load()
  }

  const toggleBlueTick = async (id: string, currentValue: boolean) => {
    const newValue = !currentValue
    // Optimistic UI update
    setAll(prev => prev.map(t => t.id === id ? { ...t, blue_tick: newValue } : t))
    try {
      await fetch('/api/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle_blue_tick', blue_tick: newValue }),
      })
      addToast(newValue ? '✅ Blue tick granted!' : 'Blue tick removed.', 'success')
    } catch {
      // Revert on error
      setAll(prev => prev.map(t => t.id === id ? { ...t, blue_tick: currentValue } : t))
      addToast('Failed to update blue tick', 'error')
    }
  }

  const filtered = activeTab === 'pending' ? all.filter(t => t.status === 'pending')
    : activeTab === 'approved' ? all.filter(t => t.status === 'approved')
    : all

  const pendingCount = all.filter(t => t.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            Testimonials
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full animate-pulse">
                <Bell className="w-3 h-3" /> {pendingCount} pending
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400">Review and approve testimonials submitted by users. Live-updates every 30s.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs hover:border-slate-600 transition-all">
          <RefreshCcw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'all'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
            {tab === 'pending' && pendingCount > 0 ? `Pending (${pendingCount})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-slate-800/60 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{activeTab === 'pending' ? 'No pending testimonials 🎉' : 'No testimonials here yet.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((t: any) => (
            <div key={t.id} className={`p-5 bg-slate-900/60 border rounded-xl transition-all ${t.status === 'pending' ? 'border-orange-500/30 bg-orange-500/5' : 'border-slate-700/40'}`}>
              {t.status === 'pending' && (
                <div className="flex items-center gap-2 text-xs text-orange-400 mb-3">
                  <Bell className="w-3.5 h-3.5 animate-pulse" />
                  New testimonial awaiting approval
                </div>
              )}
              <div className="flex items-start gap-4">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-slate-600 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {t.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-white text-sm">{t.name}</span>
                    {/* Blue tick badge */}
                    {t.blue_tick && (
                      <svg width="16" height="16" viewBox="0 0 22 22" title="Verified">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.774-1.044.907-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0"/>
                      </svg>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'approved' ? 'bg-green-500/10 text-green-400' : t.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                      {t.status}
                    </span>
                    <div className="flex gap-0.5 ml-1">
                      {Array.from({ length: t.rating || 5 }).map((_: unknown, s: number) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">{t.job_title} · {t.company}</p>
                  {/* Submitted at date/time */}
                  {(t.submitted_at || t.created_at) && (
                    <p className="text-[10px] text-slate-500 mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Submitted: {(() => {
                        const ts = Number(t.submitted_at || t.created_at)
                        const d = new Date(ts)
                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true,
                          timeZone: 'Asia/Kolkata',
                        })
                      })()}
                    </p>
                  )}
                  <p className="text-sm text-slate-300 leading-relaxed">"{t.text}"</p>
                  {t.linkedin_url && (
                    <a href={t.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 flex items-center gap-1 mt-1 hover:text-blue-300">
                      <Linkedin className="w-3 h-3" /> LinkedIn
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/40 flex-wrap">
                {t.status === 'pending' && (
                  <>
                    <button onClick={() => action(t.id, 'approve')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-500 transition-all">
                      <CheckCircle className="w-3.5 h-3.5" />Approve & Publish
                    </button>
                    <button onClick={() => action(t.id, 'reject')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-600 transition-all">
                      <X className="w-3.5 h-3.5" />Reject
                    </button>
                  </>
                )}
                {t.status === 'approved' && (
                  <button onClick={() => action(t.id, 'reject')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-600 transition-all">
                    <X className="w-3.5 h-3.5" />Unpublish
                  </button>
                )}
                {t.status === 'rejected' && (
                  <button onClick={() => action(t.id, 'approve')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/80 text-white text-xs font-semibold hover:bg-green-600 transition-all">
                    <CheckCircle className="w-3.5 h-3.5" />Approve
                  </button>
                )}

                {/* Blue Tick Toggle — always visible regardless of status */}
                <button
                  onClick={() => toggleBlueTick(t.id, !!t.blue_tick)}
                  title={t.blue_tick ? 'Remove blue tick (verified badge)' : 'Grant blue tick (celebrity / verified)'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    t.blue_tick
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30'
                      : 'bg-slate-700/60 border-slate-600/40 text-slate-400 hover:text-blue-300 hover:border-blue-500/30 hover:bg-blue-500/10'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 22 22">
                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.774-1.044.907-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                      fill={t.blue_tick ? '#1d9bf0' : '#64748b'}/>
                  </svg>
                  {t.blue_tick ? 'Remove Blue Tick' : 'Grant Blue Tick'}
                </button>

                <button onClick={() => action(t.id, 'delete')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all ml-auto">
                  <Trash2 className="w-3.5 h-3.5" />Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper: Linkedin icon (if not imported)
function Linkedin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

// Helper: Instagram icon (if not imported)
function Instagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

// ─── Meetings Admin Section — see components/dashboard/MeetingsAdminSectionV2.tsx ──

// ─── Reminders Section ─────────────────────────────────────────────────────────
function RemindersSection({ addToast }: { addToast: (m: string, t?: 'success' | 'error') => void }) {
  const [reminders, setReminders] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [triggering, setTriggering] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/reminders')
      const d = await r.json()
      setReminders(d.reminders || [])
    } catch { addToast('Failed to load reminders', 'error') }
    finally { setLoading(false) }
  }, [addToast])

  React.useEffect(() => { load() }, [load])

  const triggerCron = async () => {
    setTriggering(true)
    try {
      const r = await fetch('/api/cron/reminders')
      const d = await r.json()
      addToast(`Processed ${d.processed} reminders (${d.sent || 0} sent, ${d.failed || 0} failed)`, 'success')
      load()
    } catch { addToast('Failed to trigger reminder cron', 'error') }
    finally { setTriggering(false) }
  }

  const statusBadge = (r: any) => {
    if (r.sent) return { cls: 'bg-green-500/10 text-green-400 border-green-500/20', label: '✅ Sent', icon: '✅' }
    if (r.failed) return { cls: 'bg-red-500/10 text-red-400 border-red-500/20', label: '❌ Failed', icon: '❌' }
    const due = new Date(r.scheduled_at) <= new Date()
    if (due) return { cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: '⏳ Due Now', icon: '⏳' }
    return { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: '🕐 Scheduled', icon: '🕐' }
  }

  return (
    <SectionCard title="Reminder Status" icon={Bell}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Reminders are sent 30 minutes before each approved meeting. Add <code className="text-blue-400 text-xs bg-slate-800 px-1 rounded">CRON_SECRET</code> env var and configure Vercel Cron for automatic processing.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={triggerCron} disabled={triggering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors disabled:opacity-50">
              {triggering ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
              Trigger Now
            </button>
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No reminders scheduled yet</div>
        ) : (
          <div className="space-y-2">
            {reminders.map((r: any) => {
              const badge = statusBadge(r)
              return (
                <div key={r.id} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.cls}`}>{badge.label}</span>
                        <span className="text-xs text-white font-medium">{r.name || 'Unknown'}</span>
                        <span className="text-xs text-slate-500">{r.email || ''}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        📅 Meeting: <span className="text-white">{r.proposed_date ? new Date(r.proposed_date).toLocaleString() : '—'}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        ⏰ Reminder: <span className="text-slate-300">{new Date(r.scheduled_at).toLocaleString()}</span>
                      </div>
                      {r.fail_reason && <div className="text-xs text-red-400 mt-1">Error: {r.fail_reason}</div>}
                      {r.retry_count > 0 && <div className="text-xs text-yellow-500">Retries: {r.retry_count}</div>}
                    </div>
                    <div className="text-xs text-slate-500 flex-shrink-0">
                      {r.sent_at ? `Sent: ${new Date(r.sent_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 mb-2">🔧 Setup Instructions</p>
          <p>1. Add <code className="text-blue-400">CRON_SECRET=your-secret</code> to environment variables</p>
          <p>2. The <code className="text-blue-400">vercel.json</code> cron job runs every minute automatically on Vercel</p>
          <p>3. For other hosts, call <code className="text-blue-400">GET /api/cron/reminders?secret=YOUR_SECRET</code> every minute</p>
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Project Media Section ─────────────────────────────────────────────────────
function ProjectMediaSection({ addToast }: { addToast: (m: string, t?: 'success' | 'error') => void }) {
  const [projects, setProjects] = React.useState<{ id: string; title: string; slug: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedProject, setSelectedProject] = React.useState<string | null>(null)
  const [selectedTitle, setSelectedTitle] = React.useState<string>('')
  const [mediaByProject, setMediaByProject] = React.useState<Record<string, number>>({})

  function slugify(s: string) {
    return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  const loadProjects = React.useCallback(async () => {
    setLoading(true)
    try {
      // Use portfolio-data API which always returns normalised, live projects
      const [portRes, mediaRes] = await Promise.all([
        fetch('/api/portfolio-data'),
        fetch('/api/admin/project-media'),
      ])
      const portData = await portRes.json()
      const mediaData = await mediaRes.json()

      // Build project list from live portfolio data — every project, always fresh
      const rawProjects: any[] = portData?.projects || []
      const projs = rawProjects.map((p: any) => {
        const title = p.name || p.title || ''
        const slug  = (p.slug as string) || slugify(title)
        return { id: slug, title, slug }
      }).filter(p => p.title)

      setProjects(projs)

      // Build media counts keyed by project_id (= slug)
      const counts: Record<string, number> = {}
      for (const m of mediaData.media || []) {
        counts[m.project_id] = (counts[m.project_id] || 0) + 1
      }
      setMediaByProject(counts)
    } catch {
      addToast('Failed to load projects', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  React.useEffect(() => { loadProjects() }, [loadProjects])

  // Refresh counts when returning from a project's media editor
  const handleBack = () => {
    setSelectedProject(null)
    loadProjects()
  }

  const ProjectMediaManagerDynamic = React.lazy(() => import('@/components/project-media-manager'))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Project Media Manager</h2>
          <p className="text-sm text-slate-400">
            Upload images, GIFs, and videos per project. Media appears automatically on project cards and detail pages.
            You can also upload directly inside the <strong className="text-slate-300">Projects</strong> section.
          </p>
        </div>
        <button onClick={loadProjects} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors flex-shrink-0">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {!selectedProject ? (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              No projects found. Add projects in the <strong className="text-slate-400">Projects</strong> section first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProject(p.id); setSelectedTitle(p.title) }}
                  className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/40 rounded-xl hover:border-blue-500/40 hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition-colors">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{p.title}</p>
                    <p className="text-xs text-slate-500">
                      {mediaByProject[p.id]
                        ? <span className="text-blue-400 font-medium">{mediaByProject[p.id]} media item{mediaByProject[p.id] !== 1 ? 's' : ''}</span>
                        : <span className="italic">No media yet — click to upload</span>}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Projects
          </button>
          <React.Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>}>
            <ProjectMediaManagerDynamic
              projectId={selectedProject}
              projectTitle={selectedTitle}
              onClose={handleBack}
            />
          </React.Suspense>
        </div>
      )}
    </div>
  )
}

// ─── Chatbot Abuse / Blocked Users Section ──────────────────────────────────────
function ChatbotAbuseSection({ addToast }: { addToast: (m: string, t?: 'success' | 'error') => void }) {
  const [records, setRecords] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState<'all' | 'blocked'>('all')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/chatbot-abuse')
      const d = await r.json()
      setRecords(d.records || [])
    } catch { addToast('Failed to load abuse records', 'error') }
    finally { setLoading(false) }
  }, [addToast])

  React.useEffect(() => { load() }, [load])

  const unblock = async (id: string) => {
    if (!confirm('Unblock this user?')) return
    try {
      await fetch('/api/admin/chatbot-abuse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      addToast('User unblocked', 'success')
      load()
    } catch { addToast('Failed to unblock', 'error') }
  }

  const filtered = filter === 'blocked' ? records.filter(r => r.blocked) : records
  const blockedCount = records.filter(r => r.blocked).length

  return (
    <SectionCard title="Blocked Chatbot Users" icon={Ban}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {(['all', 'blocked'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {f === 'blocked' ? `🚫 Blocked (${blockedCount})` : `All (${records.length})`}
              </button>
            ))}
          </div>
          <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 text-xs text-slate-400">
          <p>Abuse detection: 1st offense = warning shown, 2nd offense = user blocked. Users cannot bypass by refreshing (tracked by fingerprint + IP).</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {filter === 'blocked' ? 'No blocked users' : 'No abuse records'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r: any) => (
              <div key={r.id} className={`bg-slate-800/60 border rounded-xl p-4 ${r.blocked ? 'border-red-500/20' : 'border-slate-700/40'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${r.blocked ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                        {r.blocked ? '🚫 Blocked' : '⚠️ Warned'}
                      </span>
                      <span className="text-xs font-semibold text-white">Abuse Count: {r.abuse_count}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {r.fingerprint && <span className="mr-3">🖥️ FP: <code className="text-slate-300">{r.fingerprint.slice(0, 12)}…</code></span>}
                      {r.ip_address && <span>🌐 IP: <code className="text-slate-300">{r.ip_address}</code></span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      Last abuse: {new Date(r.last_abuse_at).toLocaleString()}
                      {r.blocked_at && <> · Blocked at: {new Date(r.blocked_at).toLocaleString()}</>}
                    </div>
                  </div>
                  {r.blocked && (
                    <button
                      onClick={() => unblock(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs font-medium transition-colors flex-shrink-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Unblock
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  )
}



// ─── Version Section ──────────────────────────────────────────────────────────
// ─── Co-Admins Section (real admin only) ───────────────────────────────────
function CoAdminsSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [coAdmins, setCoAdmins] = React.useState<any[]>([])
  const [permKeys, setPermKeys] = React.useState<string[]>([])
  const [permLabels, setPermLabels] = React.useState<Record<string, string>>({})
  const [relations, setRelations] = React.useState<string[]>(['Wife', 'Brother', 'Sister', 'Friend', 'Child', 'Parent', 'Other'])
  const [activity, setActivity] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({
    name: '', username: '', password: '', relation: '', securityQuestion: '', securityAnswer: '', permissions: [] as string[],
  })
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, actRes] = await Promise.all([
        fetch('/api/admin/co-admins'),
        fetch('/api/admin/co-admins?activity=1'),
      ])
      const listData = await listRes.json()
      const actData = await actRes.json()
      if (listData.error) {
        addToast(`Co-admin data load failed: ${listData.error}`, 'error')
      } else {
        setCoAdmins(listData.coAdmins || [])
        setPermKeys(listData.permissionKeys || [])
        setPermLabels(listData.permissionLabels || {})
        if (Array.isArray(listData.relations) && listData.relations.length) setRelations(listData.relations)
        setActivity(actData.activity || [])
      }
    } catch (e: any) {
      addToast('Co-admin data load failed — check network/console.', 'error')
    }
    setLoading(false)
  }, [])
  React.useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ name: '', username: '', password: '', relation: '', securityQuestion: '', securityAnswer: '', permissions: [] })
    setEditingId(null)
  }

  const openEdit = (c: any) => {
    setForm({ name: c.name, username: c.username, password: '', relation: c.relation, securityQuestion: '', securityAnswer: '', permissions: c.permissions || [] })
    setEditingId(c.id)
    setShowForm(true)
  }

  const togglePerm = (key: string) => {
    setForm(f => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key] }))
  }

  const submit = async () => {
    if (!form.name || !form.username || !form.relation || (!editingId && (!form.password || !form.securityQuestion || !form.securityAnswer))) {
      addToast('Please fill in all required fields.', 'error')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch('/api/admin/co-admins', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, name: form.name, relation: form.relation, permissions: form.permissions,
            ...(form.password ? { password: form.password } : {}),
            ...(form.securityQuestion ? { securityQuestion: form.securityQuestion } : {}),
            ...(form.securityAnswer ? { securityAnswer: form.securityAnswer } : {}) }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        addToast('Co-admin updated!')
      } else {
        const res = await fetch('/api/admin/co-admins', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        addToast('Co-admin created!')
      }
      setShowForm(false)
      resetForm()
      load()
    } catch (e: any) {
      addToast(e?.message || 'Failed to save co-admin', 'error')
    }
    setSaving(false)
  }

  const doAction = async (id: string, action: 'enable' | 'disable' | 'unblock') => {
    await fetch('/api/admin/co-admins', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) })
    load()
  }

  const doDelete = async (id: string) => {
    await fetch(`/api/admin/co-admins?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    load()
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <SectionCard title="Co-Admins (Temporary Admins)" icon={Users}>
        <p className="text-sm text-slate-400 mb-4">
          Create restricted logins for family/trusted people. Each one only gets the sections you grant, and every edit they make is logged below.
        </p>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors mb-5"
        >
          <Plus className="w-4 h-4" /> Create Co-Admin
        </button>

        <div className="space-y-3">
          {coAdmins.length === 0 && <p className="text-slate-500 text-sm">No co-admins yet.</p>}
          {coAdmins.map(c => (
            <div key={c.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold">{c.name}</p>
                    <span className="text-xs text-slate-400">@{c.username}</span>
                    <span className="text-xs bg-slate-700 text-slate-300 rounded-full px-2 py-0.5">{c.relation}</span>
                    {c.blocked && <span className="text-xs bg-red-500/20 text-red-300 rounded-full px-2 py-0.5">Blocked</span>}
                    {!c.enabled && !c.blocked && <span className="text-xs bg-slate-600/50 text-slate-300 rounded-full px-2 py-0.5">Disabled</span>}
                    {c.enable_requested_at && !c.enabled && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 rounded-full px-2 py-0.5">Requested re-enable</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {(c.permissions || []).length} of {permKeys.length} sections editable
                    {c.last_login_at ? ` • last login ${new Date(Number(c.last_login_at)).toLocaleString()}` : ' • never logged in'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {c.blocked && (
                    <button onClick={() => doAction(c.id, 'unblock')} className="text-xs bg-green-600/20 text-green-300 hover:bg-green-600/30 px-2.5 py-1.5 rounded-lg">Unblock</button>
                  )}
                  {c.enabled ? (
                    <button onClick={() => doAction(c.id, 'disable')} className="text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg">Disable</button>
                  ) : (
                    <button onClick={() => doAction(c.id, 'enable')} className="text-xs bg-green-600/20 text-green-300 hover:bg-green-600/30 px-2.5 py-1.5 rounded-lg">Enable</button>
                  )}
                  <button onClick={() => openEdit(c)} className="text-xs bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 px-2.5 py-1.5 rounded-lg">Edit</button>
                  <button onClick={() => setConfirmDeleteId(c.id)} className="text-xs bg-red-600/20 text-red-300 hover:bg-red-600/30 px-2.5 py-1.5 rounded-lg">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Co-Admin Activity Log" icon={History}>
        {activity.length === 0 ? (
          <p className="text-slate-500 text-sm">No activity yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activity.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm bg-slate-800/40 rounded-lg px-3 py-2">
                <span className="text-slate-300">
                  <strong className="text-white">{a.co_admin_name}</strong> {a.action}
                  {a.section ? <> — <span className="text-blue-300">{a.section}</span></> : ''}
                </span>
                <span className="text-xs text-slate-500">{new Date(Number(a.created_at)).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h3 className="text-white font-semibold mb-4">{editingId ? 'Edit Co-Admin' : 'Create Co-Admin'}</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500" />
              <input value={form.username} disabled={!!editingId} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 disabled:opacity-50" />
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder={editingId ? 'New password (leave blank to keep)' : 'Password'} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500" />
              <select value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white">
                <option value="">Select relation…</option>
                {relations.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={form.securityQuestion} onChange={e => setForm(f => ({ ...f, securityQuestion: e.target.value }))} placeholder={editingId ? 'New security question (leave blank to keep)' : 'Security question (e.g. What is our pet\'s name?)'} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500" />
              <input value={form.securityAnswer} onChange={e => setForm(f => ({ ...f, securityAnswer: e.target.value }))} placeholder={editingId ? 'New answer (leave blank to keep)' : 'Answer'} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500" />

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">Editable sections</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {permKeys.map(k => (
                  <label key={k} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 rounded-lg px-2.5 py-2 cursor-pointer">
                    <input type="checkbox" checked={form.permissions.includes(k)} onChange={() => togglePerm(k)} className="accent-blue-500" />
                    {permLabels[k] || k}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
              <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full">
            <p className="text-white font-semibold mb-1.5">Delete this co-admin?</p>
            <p className="text-slate-400 text-sm mb-4">This permanently removes their login. This can't be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
              <button onClick={() => doDelete(confirmDeleteId)} className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VersionSection({ addToast }: { addToast: (msg: string, type?: Toast['type']) => void }) {
  const [version, setVersion] = React.useState('')
  const [changes, setChanges] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings || {}
        setVersion(s.site_version || '')
        setChanges(s.site_changes || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { site_version: version.trim(), site_changes: changes.trim() } }),
      })
      const d = await res.json()
      if (d.ok) {
        addToast('Version info saved! It will appear in the site footer.', 'success')
      } else {
        addToast('Failed to save version info', 'error')
      }
    } catch {
      addToast('Failed to save version info', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
    </div>
  )

  return (
    <SectionCard title="Version & Changelog" icon={Share2}>
      <div className="space-y-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300">
          <p>Set the current version number and a short changelog note. These will appear in the <strong>bottom-right corner of the site footer</strong> for visitors to see.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Version Number</Label>
            <Input
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="e.g. 2.9.1"
              className="max-w-xs"
            />
            <p className="text-xs text-slate-500 mt-1">Shown as "v{version || 'x.x.x'}" in the footer</p>
          </div>

          <div>
            <Label>Latest Changes / Changelog Note</Label>
            <Textarea
              value={changes}
              onChange={e => setChanges(e.target.value)}
              placeholder="e.g. Added dark mode, fixed project chat, improved performance"
              rows={3}
            />
            <p className="text-xs text-slate-500 mt-1">A short summary of recent changes. Shown below the version number in the footer.</p>
          </div>
        </div>

        {/* Preview */}
        {(version || changes) && (
          <div className="border border-slate-700/40 rounded-xl p-4 bg-slate-900/40">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Footer Preview</p>
            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-0.5">
                {version && (
                  <span className="text-[10px] text-slate-400 font-mono">v{version}</span>
                )}
                {changes && (
                  <span className="text-[10px] text-slate-500 max-w-[200px] text-right">{changes}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Version Info</>}
          </button>
          {version && (
            <button
              onClick={() => { setVersion(''); setChanges(''); }}
              className="px-4 py-2.5 rounded-xl border border-slate-700/60 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Sitemap Admin Section ────────────────────────────────────────────────────
function SitemapAdminSection() {
  interface SitemapNode {
    id: string
    label: string
    url: string
    desc?: string
    badge?: string
    children?: SitemapNode[]
  }

  const SITEMAP_TREE: SitemapNode[] = [
    {
      id: 'home', label: '/ — Homepage', url: '/',
      badge: 'Priority 1.0',
      desc: 'Main portfolio landing page — all sections accessible via navbar',
      children: [
        { id: 'hero',           label: '#hero — Hero & CTA',          url: '/#hero',           desc: 'Typewriter title, resume download, social links' },
        { id: 'about',          label: '#about — About Me',           url: '/#about',          desc: 'Background, values, stats' },
        { id: 'skills',         label: '#skills — Skills',            url: '/#skills',         desc: 'Tech stack with proficiency levels' },
        { id: 'experience',     label: '#experience — Experience',    url: '/#experience',     desc: 'Work history & education timeline' },
        { id: 'projects',       label: '#projects — Projects',        url: '/#projects',       desc: 'Featured projects with AI filter' },
        { id: 'devops',         label: '#devops — DevOps & Cloud',    url: '/#devops',         desc: 'Docker, Kubernetes, CI/CD, AWS' },
        { id: 'github',         label: '#github — GitHub Stats',      url: '/#github',         desc: 'Live repos, contribution heatmap' },
        { id: 'certifications', label: '#certifications',             url: '/#certifications', desc: 'Professional certifications' },
        { id: 'contact',        label: '#contact — Contact',          url: '/#contact',        desc: 'Contact form, WhatsApp, email' },
      ],
    },
    { id: 'journey',  label: '/journey — Journey',      url: '/journey',        desc: 'Personal journey, blogs & certificates' },
    { id: 'sitemap',  label: '/sitemap — Sitemap',      url: '/sitemap',        desc: 'Full interactive visual sitemap' },
    {
      id: 'projects_root', label: '/projects — Projects', url: '/projects',     desc: 'All projects list',
      children: [
        { id: 'project_slug', label: '/projects/[slug] — Project Detail', url: '/projects/', desc: 'Individual project with GitHub analysis, AI chat' },
      ],
    },
    {
      id: 'legal', label: 'Legal Pages', url: '#',
      children: [
        { id: 'privacy',  label: '/privacy-policy',    url: '/privacy-policy',  desc: 'Privacy policy page' },
        { id: 'terms',    label: '/terms-of-service',  url: '/terms-of-service',desc: 'Terms of service page' },
      ],
    },
    {
      id: 'admin', label: '/admin — Admin Panel', url: '/admin',
      children: [
        { id: 'admin_login',     label: '/admin/login',     url: '/admin/login',     desc: 'Admin login with OTP' },
        { id: 'admin_dashboard', label: '/admin/dashboard', url: '/admin/dashboard', desc: 'Full admin control panel' },
      ],
    },
    {
      id: 'api', label: '/api — API Routes', url: '#',
      desc: 'Backend API endpoints',
      children: [
        { id: 'api_ai',       label: '/api/ai',            url: '/api/ai',           desc: 'Main chatbot (Groq)' },
        { id: 'api_chat',     label: '/api/project-chat',  url: '/api/project-chat', desc: 'Project AI chat (Groq)' },
        { id: 'api_analyze',  label: '/api/analyze',       url: '/api/analyze',      desc: 'GitHub repo analyzer' },
        { id: 'api_contact',  label: '/api/contact',       url: '/api/contact',      desc: 'Contact form handler' },
        { id: 'api_portfolio',label: '/api/portfolio',     url: '/api/portfolio',    desc: 'Portfolio data CRUD' },
        { id: 'api_settings', label: '/api/admin/settings',url: '/api/admin/settings',desc: 'Admin settings' },
      ],
    },
  ]

  const [open, setOpen] = React.useState<Record<string, boolean>>({ home: true, projects_root: false, legal: false, admin: false, api: false })
  const totalPages = SITEMAP_TREE.reduce((n, t) => n + 1 + (t.children?.length || 0), 0)

  return (
    <SectionCard title="Sitemap" icon={Globe}>
      <div className="space-y-4">
        {/* Stats bar */}
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: 'Total Pages / Anchors', value: totalPages },
            { label: 'Public Routes', value: 7 },
            { label: 'API Endpoints', value: 20 },
            { label: 'Admin Routes', value: 2 },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <span className="text-base font-bold text-blue-400">{s.value}</span>
              <span className="text-xs text-slate-400">{s.label}</span>
            </div>
          ))}
          <a
            href="/sitemap"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 text-sm font-medium transition-colors"
          >
            <Globe className="w-4 h-4" />
            Open Visual Sitemap
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Tree */}
        <div className="space-y-1.5">
          {SITEMAP_TREE.map(node => {
            const isOpen = open[node.id] ?? false
            const hasChildren = node.children && node.children.length > 0
            return (
              <div key={node.id} className="border border-slate-700/40 rounded-xl overflow-hidden">
                <div
                  className={`flex items-center gap-3 px-4 py-3 ${hasChildren ? 'cursor-pointer hover:bg-slate-800/40' : ''} transition-colors`}
                  onClick={() => hasChildren && setOpen(o => ({ ...o, [node.id]: !o[node.id] }))}
                >
                  {hasChildren ? (
                    isOpen
                      ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : <span className="w-4 flex-shrink-0" />}
                  <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {node.url !== '#' ? (
                        <a
                          href={node.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-sm font-semibold text-white hover:text-blue-400 transition-colors font-mono"
                        >
                          {node.label}
                        </a>
                      ) : (
                        <span className="text-sm font-semibold text-white font-mono">{node.label}</span>
                      )}
                      {node.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600/15 border border-blue-500/20 text-blue-400 font-medium">
                          {node.badge}
                        </span>
                      )}
                    </div>
                    {node.desc && <p className="text-xs text-slate-400 mt-0.5">{node.desc}</p>}
                  </div>
                  {hasChildren && (
                    <span className="text-xs text-slate-500 flex-shrink-0">{node.children!.length} pages</span>
                  )}
                </div>
                {hasChildren && isOpen && (
                  <div className="border-t border-slate-700/40 bg-slate-900/40">
                    {node.children!.map((child, ci) => (
                      <div
                        key={child.id}
                        className={`flex items-center gap-3 px-4 py-2.5 ${ci < node.children!.length - 1 ? 'border-b border-slate-700/20' : ''}`}
                      >
                        <span className="w-4 flex-shrink-0" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0 ml-2" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {child.url !== '#' ? (
                              <a
                                href={child.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-slate-300 hover:text-blue-400 transition-colors font-mono"
                              >
                                {child.label}
                              </a>
                            ) : (
                              <span className="text-xs font-medium text-slate-300 font-mono">{child.label}</span>
                            )}
                          </div>
                          {child.desc && <p className="text-[11px] text-slate-500 mt-0.5">{child.desc}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </SectionCard>
  )
}
