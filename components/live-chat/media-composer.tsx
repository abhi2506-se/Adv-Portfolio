'use client'

import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Paperclip, Camera, X, Circle, Video, Loader2, RotateCcw, Eye, Eye as EyeTwice, FolderOpen } from 'lucide-react'

export type MediaViewMode = 'once' | 'twice' | 'keep'

export interface PendingMedia {
  file: Blob
  mediaType: 'image' | 'video'
  filename: string
  previewUrl: string
  /** How the recipient will be able to view this — chosen by the sender
   *  right before sending, via SendModePicker below. */
  viewMode: MediaViewMode
}

interface MediaComposerProps {
  disabled?: boolean
  onSelect: (media: PendingMedia) => void
}

/**
 * Paperclip (gallery) + live camera-capture buttons, shared by the user
 * and admin chat panels. Selecting/capturing a file opens the send-mode
 * picker (view once / view twice / keep in chat media); once the sender
 * confirms a mode, the media (with that mode attached) is handed up to
 * the parent via onSelect — the parent is responsible for uploading +
 * sending it accordingly.
 */
export function MediaComposer({ disabled, onSelect }: MediaComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [draft, setDraft] = useState<Omit<PendingMedia, 'viewMode'> | null>(null)

  const handleFile = (file: File | null) => {
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isVideo && !isImage) return
    setDraft({ file, mediaType: isVideo ? 'video' : 'image', filename: file.name, previewUrl: URL.createObjectURL(file) })
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={e => { handleFile(e.target.files?.[0] || null); e.target.value = '' }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        title="Send photo or video"
        className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 disabled:opacity-40 transition-colors"
      >
        <Paperclip className="w-4 h-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setCameraOpen(true)}
        title="Capture live photo/video"
        className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 disabled:opacity-40 transition-colors"
      >
        <Camera className="w-4 h-4" />
      </button>

      {cameraOpen && (
        <CameraCaptureModal
          onClose={() => setCameraOpen(false)}
          onCapture={(media) => { setCameraOpen(false); setDraft(media) }}
        />
      )}

      {draft && (
        <SendModePicker
          media={draft}
          onCancel={() => setDraft(null)}
          onConfirm={(viewMode) => { onSelect({ ...draft, viewMode }); setDraft(null) }}
        />
      )}
    </>
  )
}

/**
 * WhatsApp-style "send as" chooser shown right before a photo/video goes
 * out: View once (1 view then gone), View twice (2 views then gone, the
 * long-standing default), or Keep in Chat Media (always visible, never
 * locks, and saved permanently in the shared Chat Media gallery for both
 * sides to revisit).
 */
function SendModePicker({
  media, onCancel, onConfirm,
}: {
  media: Omit<PendingMedia, 'viewMode'>
  onCancel: () => void
  onConfirm: (mode: MediaViewMode) => void
}) {
  const options: { mode: MediaViewMode; icon: React.ReactNode; title: string; desc: string }[] = [
    { mode: 'once', icon: <Eye className="w-4 h-4" />, title: 'View once', desc: 'Disappears after it\u2019s opened once' },
    { mode: 'twice', icon: <EyeTwice className="w-4 h-4" />, title: 'View twice', desc: 'Disappears after it\u2019s opened twice' },
    { mode: 'keep', icon: <FolderOpen className="w-4 h-4" />, title: 'Keep in chat media', desc: 'Stays visible forever \u2014 saved to Chat Media' },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[100005] bg-black/70 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-sm bg-background text-foreground rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">Send as</p>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-foreground/10 text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-3 p-3 border-b border-border">
          {media.mediaType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.previewUrl} alt="Preview" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <video src={media.previewUrl} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" muted />
          )}
          <p className="text-xs text-muted-foreground">Choose how the other side can view this {media.mediaType}.</p>
        </div>
        <div className="p-2">
          {options.map(opt => (
            <button
              key={opt.mode}
              onClick={() => onConfirm(opt.mode)}
              className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl hover:bg-foreground/5 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">{opt.icon}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{opt.title}</p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

function CameraCaptureModal({ onClose, onCapture }: { onClose: () => void; onCapture: (m: PendingMedia) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [mode, setMode] = useState<'photo' | 'video'>('photo')
  const [recording, setRecording] = useState(false)
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startStream = useCallback(async (mode2: 'photo' | 'video', facingMode: 'user' | 'environment') => {
    setStarting(true)
    setError(null)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: mode2 === 'video',
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch (e: any) {
      setError('Could not access camera. Please allow camera permission and try again.')
    } finally {
      setStarting(false)
    }
  }, [stopStream])

  const initedRef = useRef(false)
  if (!initedRef.current) {
    initedRef.current = true
    // Fire once on mount.
    setTimeout(() => startStream(mode, facing), 0)
  }

  const switchCamera = () => {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    startStream(mode, next)
  }

  const switchMode = (m: 'photo' | 'video') => {
    setMode(m)
    startStream(m, facing)
  }

  const takePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      stopStream()
      onCapture({ file: blob, mediaType: 'image', filename: `capture_${Date.now()}.jpg`, previewUrl: URL.createObjectURL(blob) })
    }, 'image/jpeg', 0.9)
  }

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm'
    const rec = new MediaRecorder(stream, { mimeType })
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      stopStream()
      onCapture({ file: blob, mediaType: 'video', filename: `capture_${Date.now()}.webm`, previewUrl: URL.createObjectURL(blob) })
    }
    rec.start()
    recorderRef.current = rec
    setRecording(true)
    // Safety cap so a live capture can't grow unbounded.
    setTimeout(() => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() }, 30_000)
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  const handleClose = () => {
    stopStream()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100010] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-white/80 text-xs">Live capture • choose view mode next</p>
        <button onClick={handleClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Close camera">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {starting && <Loader2 className="w-8 h-8 text-white/70 animate-spin absolute" />}
        {error && (
          <p className="text-white/80 text-sm text-center px-6">{error}</p>
        )}
        <video ref={videoRef} muted playsInline className={`w-full h-full object-contain ${starting || error ? 'opacity-0' : 'opacity-100'}`} />
        {!starting && !error && (
          <button onClick={switchCamera} className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 py-5">
        <div className="flex items-center gap-2 bg-white/10 rounded-full p-1">
          <button onClick={() => switchMode('photo')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${mode === 'photo' ? 'bg-white text-black' : 'text-white/70'}`}>Photo</button>
          <button onClick={() => switchMode('video')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${mode === 'video' ? 'bg-white text-black' : 'text-white/70'}`}>Video</button>
        </div>

        {mode === 'photo' ? (
          <button
            onClick={takePhoto}
            disabled={starting || !!error}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30"
            aria-label="Take photo"
          >
            <Circle className="w-11 h-11 text-white fill-white" />
          </button>
        ) : (
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={starting || !!error}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30"
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            {recording ? <div className="w-6 h-6 rounded-sm bg-red-500" /> : <Video className="w-8 h-8 text-red-500" />}
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
