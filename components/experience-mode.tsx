'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCheck, Code2, Handshake, X } from 'lucide-react'

type Mode = 'recruiter' | 'developer' | 'client' | null

const MODES = [
  {
    id: 'recruiter' as const,
    label: 'Recruiter Mode',
    icon: UserCheck,
    color: 'from-blue-600 to-cyan-500',
    bg: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    description: 'See hiring info, availability & key strengths',
    banner: '👔 You\'re in Recruiter Mode — key hiring signals are highlighted across the page.',
    bannerClass: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
  },
  {
    id: 'developer' as const,
    label: 'Developer Mode',
    icon: Code2,
    color: 'from-emerald-600 to-teal-500',
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    description: 'Focus on tech stack, code quality & architecture',
    banner: '💻 Developer Mode — tech stacks, architecture choices & code details are prioritized.',
    bannerClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
  },
  {
    id: 'client' as const,
    label: 'Client Mode',
    icon: Handshake,
    color: 'from-orange-500 to-pink-500',
    bg: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
    description: 'Understand outcomes, timelines & ROI',
    banner: '🤝 Client Mode — project outcomes, timelines & business value are front and center.',
    bannerClass: 'bg-orange-500/10 border-orange-500/20 text-orange-600',
  },
]

const STORAGE_KEY = 'portfolio_mode_v1'

// ─── Context ──────────────────────────────────────────────────────────────────
const ExperienceModeContext = createContext<{ mode: Mode; setMode: (m: Mode) => void }>({
  mode: null,
  setMode: () => {},
})

export function ExperienceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Mode
    if (saved && MODES.find(m => m.id === saved)) setModeState(saved)
  }, [])

  const setMode = (m: Mode) => {
    setModeState(m)
    if (m) localStorage.setItem(STORAGE_KEY, m)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <ExperienceModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ExperienceModeContext.Provider>
  )
}

export function useExperienceMode() {
  return useContext(ExperienceModeContext)
}

// ─── Selector UI ──────────────────────────────────────────────────────────────
export function ExperienceModeSelector() {
  const { mode, setMode } = useExperienceMode()
  const [dismissed, setDismissed] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (mode) setDismissed(true)
    const timer = setTimeout(() => setShown(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const choose = (id: NonNullable<Mode>) => {
    setMode(id)
    setTimeout(() => setDismissed(true), 800)
  }

  const reset = () => {
    setMode(null)
    setDismissed(false)
  }

  const activeMode = MODES.find(m => m.id === mode)

  return (
    <>
      {/* Active mode banner */}
      <AnimatePresence>
        {mode && dismissed && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            className={`fixed top-16 left-0 right-0 z-40 flex items-center justify-center gap-3 py-2 px-4 text-xs font-medium backdrop-blur-md border-b ${activeMode?.bannerClass}`}
          >
            {activeMode?.banner}
            <button onClick={reset} className="ml-2 hover:opacity-70 transition-opacity"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode selector card */}
      <AnimatePresence>
        {shown && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-28 left-4 z-40 w-72 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
              <div>
                <p className="font-semibold text-sm">Choose Your Experience</p>
                <p className="text-xs text-muted-foreground">Personalize what you see</p>
              </div>
              <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {MODES.map(m => {
                const Icon = m.icon
                const isSelected = mode === m.id
                return (
                  <motion.button
                    key={m.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => choose(m.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `border-current ${m.bg}`
                        : 'border-border hover:border-border/80 hover:bg-secondary/60'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${m.color} text-white flex-shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none mb-0.5">{m.label}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{m.description}</p>
                    </div>
                    {isSelected && <motion.div layoutId="check" className="ml-auto w-4 h-4 rounded-full bg-current flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-[8px]">✓</span>
                    </motion.div>}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
