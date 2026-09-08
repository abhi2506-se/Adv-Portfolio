'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Phone, Calendar, X, Download } from 'lucide-react'

export function HireMeBar() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [settings, setSettings] = useState<{ whatsapp_number?: string; calendly_url?: string }>({})

  useEffect(() => {
    const savedDismiss = sessionStorage.getItem('hire_bar_dismissed')
    if (savedDismiss) { setDismissed(true); return }

    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.settings) setSettings(d.settings) })
      .catch(() => {})

    const onScroll = () => {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight)
      if (scrolled > 0.3 && !dismissed) setVisible(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [dismissed])

  const dismiss = () => {
    setVisible(false)
    setDismissed(true)
    sessionStorage.setItem('hire_bar_dismissed', '1')
  }

  const waUrl = settings.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}?text=Hi%20Abhishek%2C%20I%20want%20to%20hire%20you!`
    : null

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pointer-events-none"
        >
          <div className="max-w-lg mx-auto bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <p className="text-sm font-medium truncate">
                <span className="text-green-600">Available</span> for freelance & full-time work
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 text-xs font-medium rounded-full border border-green-500/30 transition-colors">
                  <Phone className="w-3 h-3" /> WhatsApp
                </a>
              )}
              {settings.calendly_url && (
                <a href={settings.calendly_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 text-xs font-medium rounded-full border border-blue-500/30 transition-colors">
                  <Calendar className="w-3 h-3" /> Book Call
                </a>
              )}
              <a href="/Cv.pdf" download
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 text-xs font-medium rounded-full border border-purple-500/30 transition-colors">
                <Download className="w-3 h-3" /> CV
              </a>
              <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
