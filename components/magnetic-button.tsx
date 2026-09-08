'use client'

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  strength?: number
  as?: 'button' | 'div' | 'a'
  href?: string
  onClick?: () => void
  target?: string
  rel?: string
}

export function MagneticButton({
  children,
  className = '',
  strength = 0.35,
  as: Tag = 'div',
  href,
  onClick,
  target,
  rel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) * strength
    const y = (e.clientY - top - height / 2) * strength
    setPos({ x, y })
  }, [strength])

  const handleMouseLeave = useCallback(() => {
    setPos({ x: 0, y: 0 })
  }, [])

  const props: Record<string, unknown> = { href, onClick, target, rel }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 20, mass: 0.5 }}
      className={`inline-flex cursor-pointer ${className}`}
      {...(Tag !== 'div' ? { as: Tag, ...props } : {})}
    >
      {children}
    </motion.div>
  )
}
