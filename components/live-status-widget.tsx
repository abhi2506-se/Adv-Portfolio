'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Code2, GitBranch, Coffee, ChevronDown, ChevronUp, Wifi } from 'lucide-react'

interface StatusItem {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}

const STATUS_ITEMS: StatusItem[] = [
  {
    icon: <Code2 className="w-3 h-3" />,
    label: 'Building',
    value: 'AI Portfolio v14',
    color: 'text-blue-400',
  },
  {
    icon: <Wifi className="w-3 h-3" />,
    label: 'Status',
    value: 'Open to Work',
    color: 'text-green-400',
  },
  {
    icon: <GitBranch className="w-3 h-3" />,
    label: 'Learning',
    value: 'LangGraph + RAG',
    color: 'text-purple-400',
  },
  {
    icon: <Coffee className="w-3 h-3" />,
    label: 'Fueled by',
    value: 'Coffee & Curiosity',
    color: 'text-orange-400',
  },
]

function PulsingDot({ color = 'bg-green-400' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75 animate-ping`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  )
}

export function LiveStatusWidget() {
  const [expanded, setExpanded] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if user dismissed it this session
    if (sessionStorage.getItem('status_widget_dismissed') === 'true') {
      setDismissed(true)
    }
  }, [])

  // Cycle through status items when collapsed
  useEffect(() => {
    if (expanded) return
    const t = setInterval(() => setActiveIdx(i => (i + 1) % STATUS_ITEMS.length), 3500)
    return () => clearInterval(t)
  }, [expanded])

  if (!mounted || dismissed) return null

  const active = STATUS_ITEMS[activeIdx]

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 2.5, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed bottom-28 left-4 z-40 select-none"
    >
      <motion.div
        layout
        className="
          bg-background/90 border border-border/60
          rounded-2xl shadow-xl
          backdrop-blur-xl overflow-hidden
          min-w-[200px] max-w-[240px]
          hover:border-blue-500/30 transition-colors
        "
      >
        {/* Header — always visible */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left group"
        >
          <PulsingDot />
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-1.5"
              >
                <span className={`${active.color} flex-shrink-0`}>{active.icon}</span>
                <span className="text-xs font-medium text-foreground/80 truncate">{active.value}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        </button>

        {/* Expanded rows */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/40 px-3 py-2 space-y-2">
                {STATUS_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`${item.color} flex-shrink-0`}>{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{item.label}</p>
                      <p className="text-xs font-medium text-foreground/90 truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/40 px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Live status</span>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setDismissed(true)
                    sessionStorage.setItem('status_widget_dismissed', 'true')
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
