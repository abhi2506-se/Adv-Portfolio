'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, ShieldAlert, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface MediaViewerModalProps {
  open: boolean
  loading: boolean
  error: string | null
  url: string | null
  mediaType: 'image' | 'video' | null
  viewsRemaining: number | null
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 6
const DOUBLE_TAP_SCALE = 2.5
const BUTTON_STEP = 1.5

type Pt = { x: number; y: number }

/**
 * Full-screen media viewer (WhatsApp-style).
 *
 * Images always open FITTED to the screen (whole picture visible, never
 * clipped) on both desktop and mobile, and can then be:
 *   • zoomed  — + / − buttons, keyboard (+ − 0), Ctrl/⌘ + mouse-wheel,
 *               trackpad pinch, two-finger pinch on touch, double-tap/click
 *   • scrolled — drag (mouse or finger) in any direction while zoomed,
 *               mouse-wheel / trackpad scroll up-down (Shift = left-right),
 *               arrow keys
 *
 * Why the old version showed only "half" of tall images: the image used
 * `max-h-full` inside a flex child that had no definite height (no
 * `min-h-0`), so the percentage never resolved, the image kept its natural
 * height, overflowed the screen and was centre-clipped. The stage below is
 * absolutely positioned (so it has a definite size) and the image is sized
 * against it.
 */
export function MediaViewerModal({ open, loading, error, url, mediaType, viewsRemaining, onClose }: MediaViewerModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Transform state lives in a ref (updated on every pointer move) and is
  // mirrored into React state for rendering.
  const tf = useRef({ scale: 1, x: 0, y: 0 })
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [imgReady, setImgReady] = useState(false)
  const [dragging, setDragging] = useState(false)

  const pointers = useRef<Map<number, Pt>>(new Map())
  const pinch = useRef<{ dist: number; scale: number; mid: Pt } | null>(null)
  const panStart = useRef<{ p: Pt; x: number; y: number } | null>(null)
  const lastTap = useRef<{ t: number; p: Pt } | null>(null)
  const moved = useRef(false)

  const isImage = mediaType === 'image'

  /**
   * Offset of the image's natural (un-transformed) centre from the stage's
   * centre. It is NOT zero: the stage has asymmetric padding (header on top,
   * control bar below) so the fitted image sits slightly off-centre, and both
   * the pan limits and the zoom-focus maths must account for that.
   */
  const originOffset = useCallback(() => {
    const stage = stageRef.current
    const img = imgRef.current
    if (!stage || !img) return { dx: 0, dy: 0 }
    return {
      dx: img.offsetLeft + img.offsetWidth / 2 - stage.clientWidth / 2,
      dy: img.offsetTop + img.offsetHeight / 2 - stage.clientHeight / 2,
    }
  }, [])

  const commit = useCallback((next: { scale: number; x: number; y: number }) => {
    // Clamp so the picture edge can never be dragged past the screen edge
    // (no blank gaps, and no part of the picture unreachable).
    const stage = stageRef.current
    const img = imgRef.current
    let { scale, x, y } = next
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
    if (stage && img) {
      const { dx, dy } = originOffset()
      const sw = img.offsetWidth * scale
      const sh = img.offsetHeight * scale
      // image spans [W/2 + dx + x - sw/2 , W/2 + dx + x + sw/2] and must cover [0, W]
      if (sw > stage.clientWidth) {
        const m = (sw - stage.clientWidth) / 2
        x = Math.min(m - dx, Math.max(-m - dx, x))
      } else x = 0
      if (sh > stage.clientHeight) {
        const m = (sh - stage.clientHeight) / 2
        y = Math.min(m - dy, Math.max(-m - dy, y))
      } else y = 0
    }
    if (scale === MIN_SCALE) { x = 0; y = 0 }
    tf.current = { scale, x, y }
    setView({ scale, x, y })
  }, [originOffset])

  const reset = useCallback(() => commit({ scale: 1, x: 0, y: 0 }), [commit])

  /** Zoom to `nextScale`, keeping the point `focus` (client coords) fixed. */
  const zoomTo = useCallback((nextScale: number, focus?: Pt) => {
    const stage = stageRef.current
    const cur = tf.current
    const s2 = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
    if (!stage) return commit({ ...cur, scale: s2 })
    const r = stage.getBoundingClientRect()
    const { dx, dy } = originOffset()
    // focus point relative to the transform origin (= the image's natural centre)
    const fx = (focus?.x ?? r.left + r.width / 2) - (r.left + r.width / 2 + dx)
    const fy = (focus?.y ?? r.top + r.height / 2) - (r.top + r.height / 2 + dy)
    const ratio = s2 / cur.scale
    commit({ scale: s2, x: fx - (fx - cur.x) * ratio, y: fy - (fy - cur.y) * ratio })
  }, [commit, originOffset])

  // Reset whenever a new media item opens / the viewer closes.
  useEffect(() => {
    tf.current = { scale: 1, x: 0, y: 0 }
    setView({ scale: 1, x: 0, y: 0 })
    setImgReady(false)
    pointers.current.clear()
    pinch.current = null
    panStart.current = null
  }, [url, open])

  // Lock page scroll behind the viewer.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [open])

  // Keyboard: Esc close, + / − / 0 zoom, arrows pan.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (!isImage) return
      const cur = tf.current
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(cur.scale * BUTTON_STEP) }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomTo(cur.scale / BUTTON_STEP) }
      else if (e.key === '0') { e.preventDefault(); reset() }
      else if (cur.scale > 1 && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = 80
        commit({
          ...cur,
          x: cur.x + (e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0),
          y: cur.y + (e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0),
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isImage, onClose, zoomTo, reset, commit])

  // Wheel needs a non-passive listener so we can preventDefault (React's
  // onWheel is passive and would let the page scroll / browser page-zoom).
  useEffect(() => {
    const stage = stageRef.current
    // `mounted` is a dependency: the component renders null until it is true,
    // so the stage element doesn't exist yet on the very first effect run.
    if (!open || !mounted || !stage || !isImage) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const cur = tf.current
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/⌘ + wheel, and trackpad pinch (browsers report it as ctrl+wheel)
        const factor = Math.exp(-e.deltaY * 0.01)
        zoomTo(cur.scale * factor, { x: e.clientX, y: e.clientY })
      } else if (cur.scale > 1) {
        // Plain wheel / two-finger scroll = scroll the zoomed picture.
        commit({ ...cur, x: cur.x - (e.shiftKey ? e.deltaY : e.deltaX), y: cur.y - (e.shiftKey ? 0 : e.deltaY) })
      } else {
        // At fit size, a plain wheel zooms in/out toward the cursor so the
        // feature is discoverable without a modifier key.
        zoomTo(cur.scale * (e.deltaY < 0 ? 1.25 : 0.8), { x: e.clientX, y: e.clientY })
      }
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [open, mounted, isImage, loading, error, url, zoomTo, commit])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isImage) return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values())
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: tf.current.scale,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
      panStart.current = null
    } else if (pointers.current.size === 1) {
      panStart.current = { p: { x: e.clientX, y: e.clientY }, x: tf.current.x, y: tf.current.y }
      setDragging(tf.current.scale > 1)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values())
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      moved.current = true
      zoomTo(pinch.current.scale * (dist / pinch.current.dist), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
      return
    }

    if (pointers.current.size === 1 && panStart.current && tf.current.scale > 1) {
      const dx = e.clientX - panStart.current.p.x
      const dy = e.clientY - panStart.current.p.y
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true
      commit({ scale: tf.current.scale, x: panStart.current.x + dx, y: panStart.current.y + dy })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const wasSingle = pointers.current.size === 1
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 1) {
      // Went from pinch → single finger: continue panning from here.
      const [p] = Array.from(pointers.current.values())
      panStart.current = { p, x: tf.current.x, y: tf.current.y }
    } else {
      panStart.current = null
      setDragging(false)
    }

    // Double-tap / double-click → toggle zoom.
    if (wasSingle && !moved.current) {
      const now = Date.now()
      const p = { x: e.clientX, y: e.clientY }
      const prev = lastTap.current
      if (prev && now - prev.t < 300 && Math.hypot(p.x - prev.p.x, p.y - prev.p.y) < 30) {
        if (tf.current.scale > 1.05) reset()
        else zoomTo(DOUBLE_TAP_SCALE, p)
        lastTap.current = null
      } else {
        lastTap.current = { t: now, p }
      }
    }
  }

  if (!open || !mounted) return null

  const zoomPct = Math.round(view.scale * 100)

  return createPortal(
    <div className="fixed inset-0 z-[100011] bg-black select-none" role="dialog" aria-modal="true" aria-label="Media viewer">
      {/* ── Stage: absolutely positioned => definite size, so the media can be
            sized against it. Header/controls float above it. ── */}
      <div
        ref={stageRef}
        className="absolute inset-0 overflow-hidden flex items-center justify-center"
        style={{
          // Keep the picture clear of the header / control bar when fitted,
          // and respect iOS notches & home indicator.
          padding: 'calc(56px + env(safe-area-inset-top, 0px)) 8px calc(72px + env(safe-area-inset-bottom, 0px))',
          touchAction: 'none',
          overscrollBehavior: 'contain',
          cursor: isImage && imgReady ? (view.scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in') : 'default',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {(loading || (isImage && url && !imgReady && !error)) && (
          <Loader2 className="absolute w-8 h-8 text-white/70 animate-spin" />
        )}

        {!loading && error && (
          <div className="text-center px-6">
            <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-white/80 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && url && isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={url}
            alt="Shared media"
            onLoad={() => setImgReady(true)}
            onContextMenu={e => e.preventDefault()}
            draggable={false}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
              transformOrigin: 'center center',
              transition: dragging || pointers.current.size > 0 ? 'none' : 'transform 160ms ease-out',
              opacity: imgReady ? 1 : 0,
              willChange: 'transform',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
          />
        )}

        {!loading && !error && url && mediaType === 'video' && (
          <video
            src={url}
            className="max-w-full max-h-full object-contain"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            controls
            autoPlay
            playsInline
            onContextMenu={e => e.preventDefault()}
          />
        )}
      </div>

      {/* ── Header ── */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pb-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="text-white/80 text-xs pointer-events-auto">
          {!error && viewsRemaining !== null && (
            <span>{viewsRemaining > 0 ? `${viewsRemaining} view${viewsRemaining === 1 ? '' : 's'} left` : 'Last view'}</span>
          )}
          {!error && viewsRemaining === null && url && <span>📌 Kept in Chat Media</span>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors pointer-events-auto"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Zoom controls (images only) ── */}
      {isImage && !loading && !error && url && (
        <div
          className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none"
          style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2 py-1.5 border border-white/10"
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            <button
              onClick={() => zoomTo(tf.current.scale / BUTTON_STEP)}
              disabled={view.scale <= MIN_SCALE}
              aria-label="Zoom out"
              title="Zoom out (−)"
              className="p-2.5 rounded-full text-white hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={reset}
              aria-label="Fit to screen"
              title="Fit to screen (0)"
              className="min-w-[56px] px-2 py-1.5 rounded-full text-white text-xs font-medium tabular-nums hover:bg-white/15 transition-colors flex items-center justify-center gap-1"
            >
              {view.scale > 1 ? `${zoomPct}%` : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => zoomTo(tf.current.scale * BUTTON_STEP)}
              disabled={view.scale >= MAX_SCALE}
              aria-label="Zoom in"
              title="Zoom in (+)"
              className="p-2.5 rounded-full text-white hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
