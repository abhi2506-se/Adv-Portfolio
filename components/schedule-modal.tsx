'use client'
/**
 * ScheduleModal — wraps ScheduleSection in a portal modal.
 * Drop-in replacement for the old schedule-modal.tsx.
 * Same API: <ScheduleModal trigger={<Button>…</Button>} />
 */
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CalendarDays } from 'lucide-react'
import MeetingScheduler from './meeting-scheduler'

interface ScheduleModalProps {
  trigger: React.ReactNode
  defaultType?: string  // kept for API compatibility — ignored
}

function ModalContent({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = orig }
  }, [onClose])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:99998, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' }}
      />
      <div style={{ position:'fixed', inset:0, zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', pointerEvents:'none' }}>
        <motion.div
          initial={{ opacity:0, scale:0.96, y:16 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:16 }}
          style={{
            pointerEvents:'all', width:'100%', maxWidth:'560px',
            maxHeight:'90vh', overflowY:'auto',
            background:'#0f172a', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:'1.25rem', boxShadow:'0 30px 70px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
            style={{ background:'#0f172a', borderBottom:'1px solid rgba(255,255,255,0.08)', borderRadius:'1.25rem 1.25rem 0 0' }}>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30">
                <CalendarDays className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="font-bold text-white text-base">Schedule Meeting / Interview</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Body */}
          <div className="px-6 py-5">
            <MeetingScheduler onClose={onClose} />
          </div>
        </motion.div>
      </div>
    </>
  )
}

export function ScheduleModal({ trigger, defaultType }: ScheduleModalProps) {
  const [open, setOpen]       = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const handleOpen  = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])
  return (
    <>
      <span onClick={handleOpen} style={{ display:'contents' }}>{trigger}</span>
      {mounted && createPortal(
        <AnimatePresence>
          {open && <ModalContent key="schedule-modal" onClose={handleClose} />}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
