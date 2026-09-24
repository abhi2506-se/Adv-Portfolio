'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, ShieldAlert } from 'lucide-react'

interface MediaViewerModalProps {
  open: boolean
  loading: boolean
  error: string | null
  url: string | null
  mediaType: 'image' | 'video' | null
  viewsRemaining: number | null
  onClose: () => void
}

/**
 * Full-screen "view once" media viewer (WhatsApp-style). Always opens
 * full-screen regardless of device, has an explicit Close button, and
 * once closed the caller is expected to discard the URL — the server
 * already permanently locks the message once the view limit is hit.
 */
export function MediaViewerModal({ open, loading, error, url, mediaType, viewsRemaining, onClose }: MediaViewerModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100011] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="text-white/80 text-xs pointer-events-auto">
          {!error && viewsRemaining !== null && (
            <span>{viewsRemaining > 0 ? `${viewsRemaining} view${viewsRemaining === 1 ? '' : 's'} left` : 'Last view'}</span>
          )}
          {!error && viewsRemaining === null && url && (
            <span>📌 Kept in Chat Media</span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors pointer-events-auto"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* pt-14 keeps the floating header above from covering the top of
          full-bleed portrait media — otherwise the image/video renders at
          full size but its top edge sits underneath the header bar and is
          visually hidden. */}
      <div className="flex-1 flex items-center justify-center p-2 pt-14">
        {loading && <Loader2 className="w-8 h-8 text-white/70 animate-spin" />}

        {!loading && error && (
          <div className="text-center px-6">
            <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-white/80 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && url && mediaType === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Shared media" className="max-w-full max-h-full object-contain select-none" onContextMenu={e => e.preventDefault()} draggable={false} />
        )}

        {!loading && !error && url && mediaType === 'video' && (
          <video src={url} className="max-w-full max-h-full object-contain" controls autoPlay playsInline onContextMenu={e => e.preventDefault()} />
        )}
      </div>
    </div>,
    document.body
  )
}
