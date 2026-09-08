'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, WifiOff, ShieldAlert,
  Volume2, VolumeX, Sparkles, Minus, PictureInPicture2, MessageCircle, Maximize2,
} from 'lucide-react'
import type { CallState, VideoFilterId } from '@/hooks/use-webrtc-call'

const FILTER_LABELS: Record<VideoFilterId, string> = {
  none: 'None', bw: 'B&W', warm: 'Warm', cool: 'Cool', soft: 'Soft', vivid: 'Vivid',
}

interface CallModalProps {
  state: CallState
  callType: 'audio' | 'video'
  peerName: string
  error: string | null
  localVideoEl: (el: HTMLVideoElement | null) => void
  remoteVideoEl: (el: HTMLVideoElement | null) => void
  remoteAudioEl: (el: HTMLAudioElement | null) => void
  localMuted: boolean
  localVideoOff: boolean
  speakerOn: boolean
  duration: number
  onAccept: () => void
  onReject: () => void
  onEnd: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleSpeaker: () => void
  videoFilter?: VideoFilterId
  videoFilterOptions?: VideoFilterId[]
  onSetVideoFilter?: (id: VideoFilterId) => void
  proximitySupported?: boolean
  screenDimmed?: boolean
  onDismissScreenDim?: () => void
  // Minimize-to-bubble + real OS Picture-in-Picture (both optional so this
  // component still works if a caller doesn't wire them up).
  minimized?: boolean
  onToggleMinimize?: () => void
  pipSupported?: boolean
  pipActive?: boolean
  onRequestPiP?: () => void
}

const VISIBLE_STATES: CallState[] = ['calling', 'ringing', 'connecting', 'connected', 'permission-denied', 'network-error', 'failed']

/** mm:ss formatter for the live call timer */
function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Clamp a position so the floating bubble never drags fully off-screen. */
function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

export function CallModal(props: CallModalProps) {
  const { state, callType, peerName, error, localVideoEl, remoteVideoEl, remoteAudioEl, localMuted, localVideoOff,
    speakerOn, duration, onAccept, onReject, onEnd, onToggleMute, onToggleVideo, onToggleSpeaker,
    videoFilter = 'none', videoFilterOptions = [], onSetVideoFilter, proximitySupported, screenDimmed, onDismissScreenDim,
    minimized = false, onToggleMinimize, pipSupported, pipActive, onRequestPiP } = props

  const visible = VISIBLE_STATES.includes(state)
  const [filterPickerOpen, setFilterPickerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // ── Draggable bubble position ───────────────────────────────────────────
  const bubbleSize = callType === 'video' ? { w: 132, h: 176 } : { w: 220, h: 64 }
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; dragging: boolean } | null>(null)

  useEffect(() => {
    if (minimized && pos === null && typeof window !== 'undefined') {
      setPos({ x: window.innerWidth - bubbleSize.w - 16, y: window.innerHeight - bubbleSize.h - 96 })
    }
  }, [minimized, pos, bubbleSize.w, bubbleSize.h])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!pos) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, dragging: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.dragging = true
    if (!d.dragging) return
    setPos({
      x: clamp(d.origX + dx, 4, window.innerWidth - bubbleSize.w - 4),
      y: clamp(d.origY + dy, 4, window.innerHeight - bubbleSize.h - 4),
    })
  }
  const onPointerUp = () => {
    const wasDragging = dragRef.current?.dragging
    dragRef.current = null
    return wasDragging
  }

  if (!mounted) return null

  // ── Minimized floating bubble (survives navigating other parts of the
  // app since CallModal is portaled straight to <body>, independent of
  // whatever page/panel is currently on screen). ─────────────────────────
  if (visible && minimized && pos) {
    return createPortal(
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => { if (!onPointerUp()) onToggleMinimize?.() }}
        style={{ left: pos.x, top: pos.y, width: bubbleSize.w, height: bubbleSize.h }}
        className="fixed z-[10000] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        {callType === 'video' && (state === 'connected' || state === 'connecting' || state === 'calling') ? (
          <video ref={remoteVideoEl} autoPlay playsInline className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center gap-2 px-3 bg-gradient-to-br from-violet-700 to-blue-700">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {peerName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{peerName}</p>
              <p className="text-white/70 text-[10px] tabular-nums">{state === 'connected' ? formatDuration(duration) : state}</p>
            </div>
          </div>
        )}
        <audio ref={remoteAudioEl} autoPlay playsInline className="hidden" />
        <button
          onClick={(e) => { e.stopPropagation(); onEnd() }}
          className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white shadow"
        >
          <PhoneOff className="w-3 h-3" />
        </button>
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/40 text-white text-[9px] flex items-center gap-1">
          <Maximize2 className="w-2.5 h-2.5" /> tap to expand
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <AnimatePresence>
      {visible && !minimized && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-black flex flex-col"
        >
          {/* Always-mounted audio sink for the remote stream — required for
              audio to be heard on both audio-only AND video calls, since the
              video element below only exists while callType === 'video'. */}
          <audio ref={remoteAudioEl} autoPlay playsInline className="hidden" />

          {/* ── Top bar: peer name/duration + minimize / PiP / chat controls ── */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent">
            <div className="text-white">
              <p className="text-sm font-semibold">{peerName}</p>
              {state === 'connected' && <p className="text-xs text-white/70 tabular-nums">{formatDuration(duration)}</p>}
            </div>
            <div className="flex items-center gap-2">
              {onToggleMinimize && (state === 'calling' || state === 'connecting' || state === 'connected') && (
                <button onClick={onToggleMinimize} title="Back to chat (call keeps running)" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white gap-1">
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
              {pipSupported && onRequestPiP && callType === 'video' && (state === 'connected' || state === 'connecting') && (
                <button onClick={onRequestPiP} title="Float over other apps" className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${pipActive ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                  <PictureInPicture2 className="w-4 h-4" />
                </button>
              )}
              {onToggleMinimize && (state === 'calling' || state === 'connecting' || state === 'connected') && (
                <button onClick={onToggleMinimize} title="Minimize" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                  <Minus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Proximity screen-dim: when the device reports the phone is
              held to the ear during an audio call, black out the screen
              like a native dialer instead of leaving it lit against your
              face/pocket. Tap anywhere to bring it back before hanging up. */}
          {callType === 'audio' && screenDimmed && (
            <button
              onClick={onDismissScreenDim}
              className="absolute inset-0 z-30 bg-black flex items-center justify-center text-white/40 text-xs"
            >
              Tap to wake screen
            </button>
          )}

          {/* ── Video / avatar area — fills the full viewport ── */}
          {callType === 'video' && (state === 'calling' || state === 'connecting' || state === 'connected') ? (
            <div className="relative flex-1 bg-black">
              <video ref={remoteVideoEl} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoEl} autoPlay playsInline muted className="absolute bottom-28 right-4 w-28 h-40 rounded-xl object-cover border-2 border-white/20 shadow-lg" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-4xl font-bold text-white mb-5 ring-4 ring-white/10">
                {peerName.slice(0, 1).toUpperCase()}
              </div>
              <p className="text-white text-xl font-semibold">{peerName}</p>
              <p className="text-white/60 text-sm mt-1 tabular-nums">
                {state === 'calling' && 'Calling…'}
                {state === 'ringing' && `Incoming ${callType} call…`}
                {state === 'connecting' && 'Connecting…'}
                {state === 'connected' && formatDuration(duration)}
                {state === 'permission-denied' && 'Permission needed'}
                {state === 'network-error' && 'Connection issue'}
                {state === 'failed' && 'Call failed'}
              </p>
            </div>
          )}

          {filterPickerOpen && callType === 'video' && videoFilterOptions.length > 0 && (
            <div className="mx-6 mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              {videoFilterOptions.map((id) => (
                <button
                  key={id}
                  onClick={() => onSetVideoFilter?.(id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${videoFilter === id ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-white/80 border-white/20 hover:bg-white/10'}`}
                >
                  {FILTER_LABELS[id]}
                </button>
              ))}
            </div>
          )}

          {/* ── Error banner ── */}
          {(state === 'permission-denied' || state === 'network-error' || state === 'failed') && (
            <div className="mx-6 mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
              {state === 'network-error' ? <WifiOff className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
              <span>{error || 'Something went wrong'}</span>
            </div>
          )}

          {/* ── Controls ── */}
          <div className="px-6 pb-10 pt-4 flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent">
            {state === 'ringing' && (
              <>
                <button onClick={onReject} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-colors">
                  <PhoneOff className="w-6 h-6" />
                </button>
                <button onClick={onAccept} className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center text-white shadow-lg transition-colors">
                  {callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                </button>
              </>
            )}

            {(state === 'calling' || state === 'connecting' || state === 'connected') && (
              <>
                <button onClick={onToggleMute} title={localMuted ? 'Unmute' : 'Mute'} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${localMuted ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {localMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button onClick={onToggleSpeaker} title={speakerOn ? 'Speaker on (tap for earpiece)' : 'Earpiece (tap for speaker)'} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${!speakerOn ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                {callType === 'video' && (
                  <button onClick={onToggleVideo} title={localVideoOff ? 'Turn camera on' : 'Turn camera off'} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${localVideoOff ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {localVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                )}
                {callType === 'video' && onSetVideoFilter && (
                  <button onClick={() => setFilterPickerOpen(v => !v)} title="Video filters" className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${videoFilter !== 'none' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    <Sparkles className="w-5 h-5" />
                  </button>
                )}
                <button onClick={onEnd} title="End call" className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-colors">
                  <PhoneOff className="w-6 h-6" />
                </button>
              </>
            )}

            {(state === 'permission-denied' || state === 'network-error' || state === 'failed') && (
              <button onClick={onEnd} className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 transition-colors">
                <X className="w-4 h-4" /> Close
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/** Small header buttons to start audio/video calls from the chat toolbar. */
export function CallStartButtons({ onAudio, onVideo, disabled }: { onAudio: () => void; onVideo: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={onAudio} disabled={disabled} title="Start audio call" className="p-2 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <Phone className="w-4 h-4" />
      </button>
      <button onClick={onVideo} disabled={disabled} title="Start video call" className="p-2 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <Video className="w-4 h-4" />
      </button>
    </div>
  )
}
