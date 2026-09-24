'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage, type Language } from '@/lib/language-context'
import { Globe, ChevronDown, Check } from 'lucide-react'

const LANGUAGES: { value: Language; label: string; native: string; flag: string }[] = [
  { value: 'en',       label: 'English',   native: 'English',    flag: '🇬🇧' },
  { value: 'hi',       label: 'Hindi',     native: 'हिंदी',      flag: '🇮🇳' },
  { value: 'haryanvi', label: 'Haryanvi',  native: 'हरियाणवी',   flag: '🇮🇳' },
  { value: 'de',       label: 'German',    native: 'Deutsch',     flag: '🇩🇪' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(l => l.value === language) || LANGUAGES[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (val: Language) => {
    setLanguage(val)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border/60
          bg-background/60 hover:bg-background/90 hover:border-border
          text-sm font-medium text-muted-foreground hover:text-foreground
          transition-all duration-200 select-none"
        aria-label="Select language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline text-xs">{current.native}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border/60
              bg-background/95 backdrop-blur-xl shadow-xl shadow-black/20 z-[200] overflow-hidden"
          >
            {LANGUAGES.map(lang => {
              const active = lang.value === language
              return (
                <button
                  key={lang.value}
                  onClick={() => handleSelect(lang.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left
                    ${active
                      ? 'bg-blue-600/15 text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">{lang.native}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{lang.label}</div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
