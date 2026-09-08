'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Slide bar transition overlay (like a real app)
export function PageSlideTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname}>
        {/* Wipe overlay */}
        <motion.div
          className="fixed inset-0 z-[9999] pointer-events-none bg-gradient-to-r from-blue-600 to-cyan-500 origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0, transition: { delay: 0.3, duration: 0.4, ease: [0.77, 0, 0.175, 1] } }}
          exit={{ scaleX: 1, transition: { duration: 0.4, ease: [0.77, 0, 0.175, 1] } }}
          style={{ transformOrigin: 'left' }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
