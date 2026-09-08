'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function PageLoader() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Short artificial load for smooth first paint
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center"
        >
          {/* Animated logo mark */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div className="relative w-14 h-14">
              <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500"
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
              />
              <div className="absolute inset-[3px] rounded-2xl bg-background flex items-center justify-center">
                <span className="text-lg font-black bg-gradient-to-br from-blue-600 to-cyan-500 bg-clip-text text-transparent">A</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-40 h-0.5 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.75, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Skeleton loader for cards
export function SkeletonCard() {
  return (
    <div className="bg-secondary border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-muted" />
      <div className="p-6 space-y-3">
        <div className="h-5 bg-muted rounded-lg w-3/4" />
        <div className="h-4 bg-muted rounded-lg w-full" />
        <div className="h-4 bg-muted rounded-lg w-5/6" />
        <div className="flex gap-2 pt-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-6 w-14 bg-muted rounded-full" />
          ))}
        </div>
        <div className="flex gap-2 pt-3 border-t border-border">
          <div className="h-8 flex-1 bg-muted rounded-lg" />
          <div className="h-8 w-20 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// Hero skeleton
export function SkeletonHero() {
  return (
    <div className="py-24 px-4 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-muted rounded-full" />
      <div className="space-y-3">
        <div className="h-12 w-3/4 bg-muted rounded-xl" />
        <div className="h-12 w-1/2 bg-muted rounded-xl" />
      </div>
      <div className="h-4 w-full max-w-lg bg-muted rounded-lg" />
      <div className="h-4 w-4/5 max-w-lg bg-muted rounded-lg" />
      <div className="flex gap-3 pt-2">
        <div className="h-11 w-32 bg-muted rounded-xl" />
        <div className="h-11 w-32 bg-muted rounded-xl" />
      </div>
    </div>
  )
}
