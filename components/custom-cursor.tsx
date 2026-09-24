'use client'

import { useEffect, useCallback, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export function CustomCursor() {
  const [mounted, setMounted] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [hidden, setHidden] = useState(true)
  const [isTouch, setIsTouch] = useState(false)

  const mouseX = useMotionValue(-200)
  const mouseY = useMotionValue(-200)

  // Slow trailing ring — lags behind cursor for a dreamy glow feel
  const ringX = useSpring(mouseX, { damping: 22, stiffness: 180, mass: 0.6 })
  const ringY = useSpring(mouseY, { damping: 22, stiffness: 180, mass: 0.6 })

  // Faster inner dot
  const dotX = useSpring(mouseX, { damping: 30, stiffness: 400, mass: 0.3 })
  const dotY = useSpring(mouseY, { damping: 30, stiffness: 400, mass: 0.3 })

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set(e.clientX)
    mouseY.set(e.clientY)
    setHidden(false)
  }, [mouseX, mouseY])

  useEffect(() => {
    setMounted(true)
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsTouch(true)
      return
    }

    const onMove = (e: MouseEvent) => handleMouseMove(e)
    const onLeave = () => setHidden(true)
    const onEnter = () => setHidden(false)
    const onDown = () => setClicking(true)
    const onUp = () => setClicking(false)

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    const attachHover = () => {
      document.querySelectorAll('a, button, [role="button"], input, textarea, select, label').forEach(el => {
        el.addEventListener('mouseenter', () => setHovering(true))
        el.addEventListener('mouseleave', () => setHovering(false))
      })
    }
    attachHover()
    const mo = new MutationObserver(attachHover)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      mo.disconnect()
    }
  }, [handleMouseMove])

  if (!mounted || isTouch) return null

  return (
    <>
      {/* Outer trailing glow ring */}
      <motion.div
        animate={{
          opacity: hidden ? 0 : hovering ? 0.6 : 0.38,
          scale: clicking ? 0.72 : hovering ? 1.9 : 1,
        }}
        transition={{
          opacity: { duration: 0.2 },
          scale: { type: 'spring', stiffness: 380, damping: 22 },
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 38,
          height: 38,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9990,
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          background: hovering
            ? 'radial-gradient(circle, rgba(99,179,237,0.22) 0%, rgba(59,130,246,0.08) 65%, transparent 100%)'
            : 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, rgba(99,102,241,0.07) 65%, transparent 100%)',
          border: hovering
            ? '1.5px solid rgba(99,179,237,0.5)'
            : '1.5px solid rgba(167,139,250,0.38)',
          boxShadow: hovering
            ? '0 0 20px 5px rgba(99,179,237,0.22), inset 0 0 10px rgba(99,179,237,0.1)'
            : '0 0 16px 4px rgba(139,92,246,0.16)',
        }}
      />

      {/* Inner glow dot — snappier, follows cursor closely */}
      <motion.div
        animate={{
          opacity: hidden ? 0 : clicking ? 1 : hovering ? 0.85 : 0.65,
          scale: clicking ? 1.6 : hovering ? 1.25 : 1,
        }}
        transition={{
          opacity: { duration: 0.12 },
          scale: { type: 'spring', stiffness: 600, damping: 18 },
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 7,
          height: 7,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9992,
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%',
          background: clicking
            ? 'radial-gradient(circle, #ffffff 0%, #93c5fd 55%, transparent 100%)'
            : hovering
            ? 'radial-gradient(circle, #bae6fd 0%, #38bdf8 65%, transparent 100%)'
            : 'radial-gradient(circle, #ddd6fe 0%, #8b5cf6 70%, transparent 100%)',
          boxShadow: clicking
            ? '0 0 12px 5px rgba(147,197,253,0.7)'
            : hovering
            ? '0 0 10px 4px rgba(56,189,248,0.55)'
            : '0 0 7px 3px rgba(139,92,246,0.45)',
        }}
      />
    </>
  )
}
