'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Trash2, Send, Play, Pause, Square } from 'lucide-react'

export interface PendingVoiceNote {
  file: Blob
  durationMs: number
  previewUrl: string
}

interface VoiceRecorderProps {
  disabled?: boolean
  onSend: (note: PendingVoiceNote) => void
  onPhaseChange?: (phase: 'idle' | 'recording' | 'preview') => void
}

type Phase = 'idle' | 'recording' | 'preview'

/**
 * Tap the mic button to record (like WhatsApp's newer press-once flow): a
 * live waveform + timer shows while recording; Stop moves to preview
 * (play back before sending); the trash icon cancels/discards at any point.
 */
export function VoiceRecorder({ disabled, onSend, onPhaseChange }: VoiceRecorderProps) {
  const [phase, setPhaseRaw] = useState<Phase>('idle')
  const setPhase = useCallback((p: Phase) => { setPhaseRaw(p); onPhaseChange?.(p) }, [onPhaseChange])
  const [elapsedMs, setElapsedMs] = useState(0)
  const [levels, setLevels] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [previewNote, setPreviewNote] = useState<PendingVoiceNote | null>(null)
  const [playing, setPlaying] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const previewAudioRef = useRef<HTMLAudioElement>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const drawLevels = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255
    setLevels(prev => [...prev.slice(-39), Math.max(0.08, avg)])
    rafRef.current = requestAnimationFrame(drawLevels)
  }, [])

  const startRecording = useCallback(async () => {
    if (disabled || phase !== 'idle') return
    setError(null)
    cancelledRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      // Safari (iOS + macOS) cannot record OR play back audio/webm at all —
      // if the recorder picks webm there, playback silently produces no
      // sound for whoever opens the message on an Apple device. audio/mp4
      // (AAC) is the one format every major browser can both encode and
      // decode, so prefer it whenever the browser supports recording it.
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        stopStream()
        if (cancelledRef.current) { setPhase('idle'); setElapsedMs(0); setLevels([]); return }
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const note: PendingVoiceNote = { file: blob, durationMs: Date.now() - startRef.current, previewUrl: URL.createObjectURL(blob) }
        setPreviewNote(note)
        setPhase('preview')
      }
      recorderRef.current = rec
      rec.start()
      startRef.current = Date.now()
      setPhase('recording')
      setElapsedMs(0)
      setLevels([])

      // Live waveform via Web Audio analyser
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser
      drawLevels()

      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startRef.current), 100)

      // Safety cap: WhatsApp-style voice notes shouldn't run forever.
      setTimeout(() => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() }, 5 * 60_000)
    } catch (e: any) {
      setError('Microphone permission is needed to record a voice note.')
    }
  }, [disabled, phase, stopStream, drawLevels])

  const finishRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    else { stopStream(); setPhase('idle'); setElapsedMs(0); setLevels([]) }
  }, [stopStream])

  const discardPreview = () => {
    if (previewNote) URL.revokeObjectURL(previewNote.previewUrl)
    setPreviewNote(null)
    setPhase('idle')
    setPlaying(false)
  }

  const sendPreview = () => {
    if (!previewNote) return
    onSend(previewNote)
    setPreviewNote(null)
    setPhase('idle')
    setPlaying(false)
  }

  const togglePreviewPlay = () => {
    const audio = previewAudioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => {}); setPlaying(true) }
  }

  useEffect(() => () => stopStream(), [stopStream])

  const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

  if (phase === 'preview' && previewNote) {
    return (
      <div className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-3 py-1 flex-1">
        <audio ref={previewAudioRef} src={previewNote.previewUrl} onEnded={() => setPlaying(false)} />
        <button onClick={discardPreview} className="p-2 rounded-full hover:bg-foreground/10 text-red-500" title="Discard">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={togglePreviewPlay} className="p-2 rounded-full bg-foreground/10 hover:bg-foreground/20">
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <span className="text-xs text-muted-foreground flex-1 tabular-nums">{fmt(previewNote.durationMs)}</span>
        <button onClick={sendPreview} className="p-2 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div className="flex items-center gap-2 bg-muted rounded-full pl-3 pr-1 py-1 flex-1">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <span className="text-xs tabular-nums text-foreground w-10 flex-shrink-0">{fmt(elapsedMs)}</span>
        <div className="flex-1 flex items-end gap-[2px] h-6 overflow-hidden">
          {levels.map((l, i) => <span key={i} className="w-[3px] rounded-full bg-red-500 flex-shrink-0" style={{ height: `${Math.max(15, l * 100)}%` }} />)}
        </div>
        <button onClick={cancelRecording} className="p-2 rounded-full hover:bg-foreground/10 text-red-500" title="Cancel">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={finishRecording} className="p-2 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white" title="Stop & preview">
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={startRecording}
        title="Tap to record a voice note"
        className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 disabled:opacity-40 transition-colors"
      >
        <Mic className="w-4 h-4" />
      </button>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </>
  )
}
