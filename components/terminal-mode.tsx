'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, X, Maximize2, Minimize2, TerminalSquare } from 'lucide-react'
import { usePortfolioData } from '@/hooks/usePortfolioData'

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system'
  text: string
  id: number
}

const BOOT_LINES = [
  '> Initializing portfolio terminal v2.0...',
  '> Loading modules: [skills] [projects] [experience] [contact]',
  '> All systems nominal. Type `help` to get started.',
]

function useTerminalCommands() {
  const { hero, projects, skills } = usePortfolioData()

  const commands: Record<string, () => string | string[]> = {
    help: () => [
      '╔════════════════════════════════╗',
      '║   AVAILABLE COMMANDS           ║',
      '╚════════════════════════════════╝',
      '  help        — show this menu',
      '  about        — who is Abhishek?',
      '  skills       — tech stack overview',
      '  projects     — list of projects',
      '  experience   — work history',
      '  resume       — open resume PDF',
      '  github       — open GitHub profile',
      '  contact      — contact information',
      '  clear        — clear terminal',
      '  exit         — close terminal',
    ],

    about: () => [
      `> ${hero.name}`,
      `> ${hero.title}`,
      `> ${hero.subtitle}`,
      hero.available ? '> Status: 🟢 Available for opportunities' : '> Status: 🔴 Not currently available',
    ],

    skills: () => {
      const cats = skills.categories ?? []
      if (!cats.length) return ['> No skills data loaded yet.']
      return [
        '> TECH STACK',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ...cats.flatMap((c: any) => [
          `  [${c.name}]`,
          `  ${(c.skills ?? []).join(' • ')}`,
          '',
        ]),
      ]
    },

    projects: () => {
      if (!projects.length) return ['> No projects data loaded yet.']
      return [
        '> PROJECTS',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ...projects.map((p: any, i: number) => `  [${i + 1}] ${p.title} — ${p.tech?.slice(0, 3).join(', ')}`),
        '',
        '> Visit #projects section for details',
      ]
    },

    experience: () => ['> Scroll to #experience section or ask the AI assistant for details.'],

    resume: () => {
      if (typeof window !== 'undefined') {
        setTimeout(() => window.open(hero.resumeUrl || '/Cv.pdf', '_blank'), 300)
      }
      return ['> Opening resume... 📄']
    },

    github: () => {
      if (typeof window !== 'undefined' && hero.github) {
        setTimeout(() => window.open(hero.github, '_blank'), 300)
      }
      return [`> Opening GitHub: ${hero.github} 🔗`]
    },

    contact: () => [
      '> CONTACT',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      hero.email    ? `  ✉  ${hero.email}` : '',
      hero.linkedin ? `  in  ${hero.linkedin}` : '',
      hero.github   ? `  gh  ${hero.github}` : '',
    ].filter(Boolean),

    clear: () => '__CLEAR__',
    exit: () => '__EXIT__',
  }

  return commands
}

// ─── Trigger button ───────────────────────────────────────────────────────────
export function TerminalTrigger({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.94 }}
      title="Open Terminal (Ctrl + `)"
      className="
        fixed bottom-[5.5rem] right-4 z-40
        w-11 h-11 rounded-xl
        flex items-center justify-center
        bg-background/80 border border-border
        shadow-md
        text-muted-foreground hover:text-foreground
        backdrop-blur-sm
        transition-colors
        group
      "
    >
      <TerminalSquare className="w-5 h-5 group-hover:text-green-400 transition-colors" />
    </motion.button>
  )
}

// ─── Main terminal window ─────────────────────────────────────────────────────
export function TerminalMode({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [maximized, setMaximized] = useState(false)
  const [booted, setBooted] = useState(false)
  const [counter, setCounter] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const commands = useTerminalCommands()

  const nextId = useCallback(() => { setCounter(c => c + 1); return counter }, [counter])

  // Boot sequence
  useEffect(() => {
    let i = 0
    const bootInterval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setLines(l => [...l, { type: 'system', text: BOOT_LINES[i], id: Date.now() + i }])
        i++
      } else {
        clearInterval(bootInterval)
        setBooted(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }, 320)
    return () => clearInterval(bootInterval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const runCommand = (raw: string) => {
    const cmd = raw.trim().toLowerCase()
    if (!cmd) return

    const inputLine: TerminalLine = { type: 'input', text: `$ ${raw.trim()}`, id: Date.now() }
    setLines(l => [...l, inputLine])
    setHistory(h => [raw.trim(), ...h].slice(0, 40))
    setHistIdx(-1)

    const handler = commands[cmd]
    if (!handler) {
      setLines(l => [...l, { type: 'error', text: `bash: ${cmd}: command not found. Type 'help' for commands.`, id: Date.now() + 1 }])
      return
    }

    const result = handler()
    if (result === '__CLEAR__') { setLines([]); return }
    if (result === '__EXIT__') { onClose(); return }

    const outputs = Array.isArray(result) ? result : [result]
    setLines(l => [...l, ...outputs.filter(Boolean).map((text, i) => ({
      type: 'output' as const, text, id: Date.now() + i + 2,
    }))])
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIdx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(newIdx)
      setInput(history[newIdx] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIdx = Math.max(histIdx - 1, -1)
      setHistIdx(newIdx)
      setInput(newIdx === -1 ? '' : history[newIdx])
    } else if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }

  const lineColor = {
    input:  'text-green-400',
    output: 'text-foreground/90',
    error:  'text-red-400',
    system: 'text-blue-400/80',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 40 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`
        fixed z-50 flex flex-col
        ${maximized
          ? 'inset-4 rounded-2xl'
          : 'bottom-20 right-4 w-[min(520px,calc(100vw-2rem))] h-[420px] rounded-2xl'}
        bg-black/95 border border-green-500/30
        shadow-[0_0_40px_rgba(34,197,94,0.15),0_20px_60px_rgba(0,0,0,0.6)]
        backdrop-blur-xl overflow-hidden
        font-mono text-sm
        terminal-glow
      `}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-b border-green-500/20 flex-shrink-0">
        <div className="flex gap-1.5">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <button onClick={() => setMaximized(m => !m)} className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5 text-green-400/60 text-xs">
          <Terminal className="w-3 h-3" />
          <span>portfolio — terminal v2.0</span>
        </div>
        <button onClick={() => setMaximized(m => !m)} className="text-muted-foreground hover:text-foreground transition-colors">
          {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onClose} className="text-muted-foreground hover:text-red-400 transition-colors ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/20">
        {lines.map(line => (
          <div key={line.id} className={`leading-relaxed whitespace-pre-wrap break-words ${lineColor[line.type]}`}>
            {line.text}
          </div>
        ))}
        {!booted && (
          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5" />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {booted && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-green-500/20 bg-white/2 flex-shrink-0">
          <span className="text-green-400 select-none">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="type a command..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-green-300 outline-none placeholder-green-800 caret-green-400"
          />
          <span className="text-green-800 text-xs hidden md:block">↑↓ history · Esc close</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Full wiring: keyboard shortcut only (trigger button removed) ──────────────
export function TerminalWidget() {
  const [open, setOpen] = useState(false)

  // Ctrl+` still opens the terminal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') { e.preventDefault(); setOpen(o => !o) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <AnimatePresence>
      {open && <TerminalMode onClose={() => setOpen(false)} />}
    </AnimatePresence>
  )
}
