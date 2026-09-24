import { useEffect } from 'react'

/**
 * Locks ALL page scrolling while `locked` is true.
 *
 * – Freezes <body> with position:fixed (prevents main page scroll)
 * – Compensates for scrollbar removal so layout doesn't shift
 * – Also locks any element marked with [data-scroll-lock-target]
 *   (e.g., the admin <main> overflow-y-auto container)
 * – Restores exact scroll position on unlock
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const scrollY   = window.scrollY
    const body      = document.body
    const root      = document.documentElement

    // Measure scrollbar so removing it doesn't cause layout shift
    const scrollbarWidth = window.innerWidth - root.clientWidth

    // Save body styles
    const prev = {
      overflow:     body.style.overflow,
      position:     body.style.position,
      top:          body.style.top,
      width:        body.style.width,
      paddingRight: body.style.paddingRight,
    }

    body.style.overflow     = 'hidden'
    body.style.position     = 'fixed'
    body.style.top          = `-${scrollY}px`
    body.style.width        = '100%'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    // Lock explicitly-marked scroll containers (e.g. admin main panel).
    // These are separate from <body> and need their own overflow lock.
    const lockedContainers: Array<{ el: HTMLElement; oy: string }> = []
    document.querySelectorAll<HTMLElement>('[data-scroll-lock-target]').forEach(el => {
      lockedContainers.push({ el, oy: el.style.overflowY })
      el.style.overflowY = 'hidden'
    })

    return () => {
      body.style.overflow     = prev.overflow
      body.style.position     = prev.position
      body.style.top          = prev.top
      body.style.width        = prev.width
      body.style.paddingRight = prev.paddingRight
      window.scrollTo(0, scrollY)

      lockedContainers.forEach(({ el, oy }) => {
        el.style.overflowY = oy
      })
    }
  }, [locked])
}
