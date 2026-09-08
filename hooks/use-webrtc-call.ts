'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type CallState =
  | 'idle'
  | 'calling'        // we placed a call, waiting for answer
  | 'ringing'         // incoming call, waiting for local accept/reject
  | 'connecting'      // accepted, establishing WebRTC connection
  | 'connected'
  | 'ended'
  | 'rejected'
  | 'failed'
  | 'permission-denied'
  | 'network-error'

export interface CallSignalSender {
  (payload: any): void
}

interface UseWebRTCCallOptions {
  chatId: string | null
  role: 'user' | 'admin'
  onSignal: CallSignalSender // provided by useLiveChatRealtime().sendCallSignal
  logCall: (action: 'start' | 'end', data: any) => Promise<any>
}

/**
 * One-to-one audio/video calling over WebRTC.
 * Signalling (offer/answer/ICE candidates) travels over the Supabase
 * Realtime broadcast channel already open for the chat — no extra server
 * needed. TURN relay credentials come from /api/live-chat/turn.
 */
const VIDEO_FILTERS = {
  none: '',
  bw: 'grayscale(1) contrast(1.05)',
  warm: 'sepia(0.35) saturate(1.3) contrast(1.05)',
  cool: 'saturate(1.15) hue-rotate(-8deg) contrast(1.05)',
  soft: 'brightness(1.08) contrast(0.95) saturate(1.05) blur(0.3px)',
  vivid: 'contrast(1.2) saturate(1.4)',
} as const
export type VideoFilterId = keyof typeof VIDEO_FILTERS

/**
 * Bumps the outgoing Opus audio to a higher bitrate/richer stereo profile by
 * editing the SDP before it's set — the browser's default Opus bitrate
 * (~32kbps) is tuned for bandwidth savings, not call quality. This alone,
 * combined with the noiseSuppression/echoCancellation/autoGainControl
 * constraints in getLocalMedia below, is what actually gets you "HD voice":
 * getUserMedia constraints control what's captured and cleaned up at the
 * mic; this SDP tweak controls how much of that quality survives being
 * encoded and sent over the wire.
 */
function boostOpusAudio(sdp: string): string {
  return sdp.replace(/a=fmtp:(\d+) apt=\d+\r?\n/g, (m) => m) // no-op guard, keep other fmtp lines intact
    .replace(/(m=audio.*\r?\n(?:.*\r?\n)*?a=rtpmap:(\d+) opus\/48000\/2\r?\n)/, (match, block, payload) => {
      const fmtpRegex = new RegExp(`a=fmtp:${payload} .*\\r?\\n`)
      const extra = `a=fmtp:${payload} minptime=10;useinbandfec=1;maxaveragebitrate=128000;stereo=1;sprop-stereo=1\r\n`
      if (fmtpRegex.test(block)) return block.replace(fmtpRegex, extra)
      return block + extra
    })
}

/**
 * Best-effort proximity sensing so an audio call can dim/blank the screen
 * when the phone is held to the ear, the way native dialers do. There is
 * no universal, stable Web API for this — the generic Sensor API's
 * `ProximitySensor` is only implemented (behind a permission prompt) on
 * some Chromium-on-Android builds, and iOS Safari exposes nothing at all.
 * Where it IS available we use it to add a full-screen black overlay
 * (cheaper and more reliable than trying to programmatically turn off the
 * actual backlight, which pages can't do). Where it isn't, we simply don't
 * show the control — we do not fake this with a wake-lock trick, since a
 * wrong guess would black out the screen for someone who isn't on a call
 * against their ear, which is worse than not offering the feature.
 */
function isProximitySensorSupported(): boolean {
  return typeof window !== 'undefined' && 'ProximitySensor' in window
}

export function useWebRTCCall({ chatId, role, onSignal, logCall }: UseWebRTCCallOptions) {
  const [state, setState] = useState<CallState>('idle')
  const [callType, setCallType] = useState<'audio' | 'video'>('audio')
  const [remoteMuted, setRemoteMuted] = useState(false)
  const [localMuted, setLocalMuted] = useState(false)
  const [localVideoOff, setLocalVideoOff] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [duration, setDuration] = useState(0) // seconds, counts up once connected
  const [error, setError] = useState<string | null>(null)
  const [videoFilter, setVideoFilter] = useState<VideoFilterId>('none')
  const [proximitySupported] = useState(isProximitySensorSupported)
  const [screenDimmed, setScreenDimmed] = useState(false) // true while the proximity sensor reports "near"
  // ── Minimize / floating-window state ────────────────────────────────────
  // `minimized`: our own in-page floating bubble (works everywhere, draggable,
  // rendered by CallModal). `pipActive`: the browser's REAL OS-level Picture-
  // in-Picture window (via requestPictureInPicture), which can float over
  // other native apps on platforms that support it (desktop Chrome/Edge,
  // Android Chrome; iOS Safari 14.5+ for a single <video> element). We keep
  // both because native PiP is not available everywhere and only floats a
  // single <video> (no custom controls drawn on it on most platforms).
  const [minimized, setMinimized] = useState(false)
  const [pipActive, setPipActive] = useState(false)
  const [pipSupported] = useState(() =>
    typeof document !== 'undefined' &&
    (('pictureInPictureEnabled' in document) ||
      // iOS Safari: presentation-mode API on the video element itself; we can't
      // feature-detect the element yet, so assume WebKit builds may support it
      // and let requestPiP() fail gracefully if not.
      /iPad|iPhone|iPod/.test(navigator.userAgent))
  )

  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream>(new MediaStream())
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const callIdRef = useRef<string | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const isCallerRef = useRef(false)
  const iceServersRef = useRef<RTCIceServer[]>([{ urls: 'stun:stun.l.google.com:19302' }])
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connectedAtRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)
  const proximitySensorRef = useRef<any>(null)
  // Canvas-filter pipeline for outgoing video (so the FILTER is seen by the
  // other party, not just applied cosmetically to our own local preview).
  const filterCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const filterRafRef = useRef<number | null>(null)
  const rawVideoTrackRef = useRef<MediaStreamTrack | null>(null) // unfiltered camera track, kept so we can re-filter or turn filters off cleanly

  const localVideoEl = useRef<HTMLVideoElement | null>(null)
  const remoteVideoEl = useRef<HTMLVideoElement | null>(null)
  // Always-mounted audio sink for the remote stream. The <video> element in the
  // call UI is only rendered while callType === 'video', so audio-only calls had
  // nothing actually playing the remote MediaStream — this element fixes that by
  // existing regardless of call type / video visibility.
  const remoteAudioEl = useRef<HTMLAudioElement | null>(null)

  // The video/audio elements above only exist in the DOM while the call UI
  // shows a video area (see CallModal's render condition), which can mount
  // *after* the local/remote MediaStream is already attached in code (e.g.
  // the caller's local stream is grabbed while state === 'calling', before
  // the element renders at all; the remote track can likewise arrive before
  // 'connected' flips the video area on). A plain `ref={someRef}` never gets
  // reapplied once such a late-mounted element appears, so one side of the
  // call silently ends up with no video. These callback refs re-attach the
  // current stream (if any) the instant the element mounts, closing that race.
  const setLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
    localVideoEl.current = el
    if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
      el.srcObject = localStreamRef.current
    }
  }, [])
  const setRemoteVideoEl = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoEl.current = el
    if (el && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current
    }
  }, [])
  const setRemoteAudioEl = useCallback((el: HTMLAudioElement | null) => {
    remoteAudioEl.current = el
    if (el && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current
      el.play().catch(() => {})
    }
  }, [])

  const attachRemoteStream = useCallback(() => {
    if (remoteVideoEl.current && remoteVideoEl.current.srcObject !== remoteStreamRef.current) {
      remoteVideoEl.current.srcObject = remoteStreamRef.current
    }
    if (remoteAudioEl.current && remoteAudioEl.current.srcObject !== remoteStreamRef.current) {
      remoteAudioEl.current.srcObject = remoteStreamRef.current
      remoteAudioEl.current.play().catch(() => {})
    }
  }, [])

  // ── Call duration timer ─────────────────────────────────────────────────
  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    connectedAtRef.current = null
    setDuration(0)
  }, [])

  const startDurationTimer = useCallback(() => {
    if (durationTimerRef.current) return
    connectedAtRef.current = Date.now()
    setDuration(0)
    durationTimerRef.current = setInterval(() => {
      if (connectedAtRef.current) {
        setDuration(Math.floor((Date.now() - connectedAtRef.current) / 1000))
      }
    }, 1000)
  }, [])

  // ── Fetch TURN/STUN config once ─────────────────────────────────────────
  useEffect(() => {
    fetch('/api/live-chat/turn').then(r => r.json()).then(d => {
      if (d.iceServers) iceServersRef.current = d.iceServers
    }).catch(() => {})
  }, [])

  // ── Video filters ────────────────────────────────────────────────────────
  // Applies a visual filter to the OUTGOING video by drawing the raw camera
  // track to a canvas each frame with a CSS filter, then swapping the
  // RTCRtpSender's track for `canvas.captureStream()`'s track — so the
  // person on the other end of the call sees the filtered picture too, not
  // just our own local preview.
  const stopFilterPipeline = useCallback(() => {
    if (filterRafRef.current) { cancelAnimationFrame(filterRafRef.current); filterRafRef.current = null }
    filterCanvasRef.current = null
  }, [])

  const applyVideoFilter = useCallback(async (filterId: VideoFilterId) => {
    setVideoFilter(filterId)
    const rawTrack = rawVideoTrackRef.current
    const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
    if (!rawTrack) return

    if (filterId === 'none') {
      stopFilterPipeline()
      if (sender && sender.track !== rawTrack) await sender.replaceTrack(rawTrack).catch(() => {})
      if (localVideoEl.current) localVideoEl.current.style.filter = ''
      return
    }

    // Instant feedback in the local preview even before the canvas pipeline spins up.
    if (localVideoEl.current) localVideoEl.current.style.filter = VIDEO_FILTERS[filterId]

    const settings = rawTrack.getSettings()
    const canvas = document.createElement('canvas')
    canvas.width = settings.width || 1280
    canvas.height = settings.height || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    filterCanvasRef.current = canvas

    const sourceVideo = document.createElement('video')
    sourceVideo.srcObject = new MediaStream([rawTrack])
    sourceVideo.muted = true
    await sourceVideo.play().catch(() => {})

    const draw = () => {
      if (filterCanvasRef.current !== canvas) return // filter was switched off mid-loop
      ctx.filter = VIDEO_FILTERS[filterId]
      ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height)
      filterRafRef.current = requestAnimationFrame(draw)
    }
    draw()

    const filteredTrack = canvas.captureStream(30).getVideoTracks()[0]
    if (sender && filteredTrack) await sender.replaceTrack(filteredTrack).catch(() => {})
  }, [stopFilterPipeline])

  // ── Screen wake lock ─────────────────────────────────────────────────────
  // Video calls: keep the screen ON (you're looking at it). Audio-only
  // calls: deliberately do NOT take a wake lock, so the device's own
  // screen-off timeout can still kick in as normal — combined with the
  // proximity dimming below where supported, this is what keeps an audio
  // call from lighting up your face/pocket the whole time.
  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      }
    } catch {
      // Not fatal — some browsers deny this outside a user gesture or in the background.
    }
  }, [])
  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release?.().catch(() => {})
    wakeLockRef.current = null
  }, [])

  // ── Proximity dimming (audio calls, where supported) ────────────────────
  const startProximityWatch = useCallback(() => {
    if (!proximitySupported) return
    try {
      const Sensor = (window as any).ProximitySensor
      const sensor = new Sensor({ frequency: 5 })
      sensor.addEventListener('reading', () => setScreenDimmed(!!sensor.near))
      sensor.addEventListener('error', () => setScreenDimmed(false))
      sensor.start()
      proximitySensorRef.current = sensor
    } catch {
      // Permission denied or hardware unavailable — fail silently, no overlay offered.
    }
  }, [proximitySupported])
  const stopProximityWatch = useCallback(() => {
    try { proximitySensorRef.current?.stop?.() } catch {}
    proximitySensorRef.current = null
    setScreenDimmed(false)
  }, [])

  // ── Media Session — lets the OS lock screen / notification shade show
  // call metadata and hardware media-key controls, and helps keep the
  // audio pipeline alive when the tab is backgrounded on mobile. ─────────
  const setMediaSessionState = useCallback((active: boolean, peerLabel: string) => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try {
      if (active) {
        ;(navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
          title: `Call with ${peerLabel}`,
          artist: 'Live Chat',
        })
        ;(navigator as any).mediaSession.playbackState = 'playing'
        ;(navigator as any).mediaSession.setActionHandler('hangup', () => endCallRef.current?.())
      } else {
        ;(navigator as any).mediaSession.playbackState = 'none'
        ;(navigator as any).mediaSession.metadata = null
      }
    } catch {}
  }, [])
  const endCallRef = useRef<(() => void) | null>(null)


  const cleanup = useCallback((finalState: CallState) => {
    pcRef.current?.getSenders().forEach(s => s.track?.stop())
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    rawVideoTrackRef.current = null
    stopFilterPipeline()
    setVideoFilter('none')
    remoteStreamRef.current.getTracks().forEach(t => remoteStreamRef.current.removeTrack(t))
    if (remoteAudioEl.current) remoteAudioEl.current.srcObject = null
    if (remoteVideoEl.current) remoteVideoEl.current.srcObject = null
    pendingCandidatesRef.current = []
    stopDurationTimer()
    releaseWakeLock()
    stopProximityWatch()
    setMediaSessionState(false, '')
    setState(finalState)
    setMinimized(false)
    setPipActive(false)
    try { if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {}) } catch {}
    setTimeout(() => setState(s => (s === finalState ? 'idle' : s)), 3000)
  }, [stopDurationTimer, stopFilterPipeline, releaseWakeLock, stopProximityWatch, setMediaSessionState])

  const toggleMinimize = useCallback(() => setMinimized(v => !v), [])

  // ── Real OS-level Picture-in-Picture ─────────────────────────────────────
  // Floats the remote party's video in its own always-on-top window that can
  // sit over OTHER apps (not just other tabs/pages of this site) on platforms
  // that support it. We prefer the remote video (the person you're watching);
  // if that track isn't available yet (e.g. audio call, or video still
  // connecting) we fall back to the local preview so the button still does
  // something sensible rather than silently failing.
  const requestPiP = useCallback(async () => {
    const remoteEl = remoteVideoEl.current as (HTMLVideoElement & { webkitSetPresentationMode?: (m: string) => void; webkitSupportsPresentationMode?: (m: string) => boolean }) | null
    const localEl = localVideoEl.current
    const target = (remoteEl && remoteEl.srcObject && (remoteEl.srcObject as MediaStream).getVideoTracks().length > 0) ? remoteEl : localEl
    if (!target) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        setPipActive(false)
        return
      }
      if ('requestPictureInPicture' in target) {
        await (target as any).requestPictureInPicture()
        setPipActive(true)
        setMinimized(true) // hide our own overlay UI — the OS window is now the "call view"
      } else if ((target as any).webkitSupportsPresentationMode?.('picture-in-picture')) {
        ;(target as any).webkitSetPresentationMode?.('picture-in-picture')
        setPipActive(true)
        setMinimized(true)
      }
    } catch {
      // Not fatal — button just does nothing if the platform refuses (e.g.
      // no user gesture, or PiP disabled by the browser/site settings).
    }
  }, [])

  useEffect(() => {
    const el = remoteVideoEl.current
    if (!el) return
    const onEnter = () => setPipActive(true)
    const onLeave = () => { setPipActive(false); setMinimized(false) }
    el.addEventListener('enterpictureinpicture', onEnter)
    el.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      el.removeEventListener('enterpictureinpicture', onEnter)
      el.removeEventListener('leavepictureinpicture', onLeave)
    }
  }, [state])

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })

    pc.onicecandidate = (e) => {
      if (e.candidate) onSignal({ kind: 'ice', from: role, callId: callIdRef.current, candidate: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      // Add any new tracks to the remote stream (guard against duplicates).
      e.streams[0]?.getTracks().forEach(t => {
        if (!remoteStreamRef.current.getTracks().includes(t)) remoteStreamRef.current.addTrack(t)
      })
      attachRemoteStream()
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setState('connected')
        startDurationTimer()
        attachRemoteStream()
        setMediaSessionState(true, 'Live Chat')
        if (callType === 'video') acquireWakeLock()
        else startProximityWatch()
      }
      if (pc.connectionState === 'failed') { setError('Network connection failed'); cleanup('network-error') }
      if (pc.connectionState === 'disconnected') { setError('Connection lost'); cleanup('network-error') }
    }
    pcRef.current = pc
    return pc
  }, [onSignal, role, cleanup, attachRemoteStream, startDurationTimer, callType, acquireWakeLock, startProximityWatch, setMediaSessionState])


  const getLocalMedia = useCallback(async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,   // strips steady background noise (fans, traffic, hum)
          autoGainControl: true,    // keeps human voice level consistent
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
        },
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        } : false,
      })
      localStreamRef.current = stream
      rawVideoTrackRef.current = stream.getVideoTracks()[0] || null
      if (localVideoEl.current) localVideoEl.current.srcObject = stream
      return stream
    } catch (e: any) {
      setError(e?.name === 'NotAllowedError' ? 'Camera/microphone permission denied' : 'Could not access camera/microphone')
      setState('permission-denied')
      throw e
    }
  }, [])

  // ── Place an outgoing call ──────────────────────────────────────────────
  const startCall = useCallback(async (type: 'audio' | 'video') => {
    if (!chatId) return
    setError(null)
    setCallType(type)
    isCallerRef.current = true
    setState('calling')
    try {
      const { callId } = await logCall('start', { chatId, type, callerRole: role })
      callIdRef.current = callId
      const stream = await getLocalMedia(type === 'video')
      const pc = createPeerConnection()
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      const offer = await pc.createOffer()
      offer.sdp = boostOpusAudio(offer.sdp || '')
      await pc.setLocalDescription(offer)
      onSignal({ kind: 'offer', from: role, callId, callType: type, sdp: offer })
    } catch (e) {
      if (state !== 'permission-denied') cleanup('failed')
    }
  }, [chatId, role, onSignal, getLocalMedia, createPeerConnection, logCall, state, cleanup])

  // ── Respond to signals from the other side ──────────────────────────────
  const handleSignal = useCallback(async (payload: any) => {
    if (!payload || payload.from === role) return // ignore our own echoes

    if (payload.kind === 'offer') {
      callIdRef.current = payload.callId
      setCallType(payload.callType || 'audio')
      setState('ringing')
      ;(handleSignal as any)._pendingOffer = payload.sdp
      return
    }

    if (payload.kind === 'answer' && pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      for (const c of pendingCandidatesRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(c))
      pendingCandidatesRef.current = []
      return
    }

    if (payload.kind === 'ice') {
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
      } else {
        pendingCandidatesRef.current.push(payload.candidate)
      }
      return
    }

    if (payload.kind === 'reject') { setError('Call declined'); cleanup('rejected'); return }
    if (payload.kind === 'end') { cleanup('ended'); return }
    if (payload.kind === 'mute-state') { setRemoteMuted(!!payload.muted); return }
  }, [role, cleanup])

  // ── Accept an incoming call ─────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const offerSdp = (handleSignal as any)._pendingOffer
    if (!offerSdp || !chatId) return
    setState('connecting')
    try {
      const stream = await getLocalMedia(callType === 'video')
      const pc = createPeerConnection()
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp))
      for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c))
      pendingCandidatesRef.current = []
      const answer = await pc.createAnswer()
      answer.sdp = boostOpusAudio(answer.sdp || '')
      await pc.setLocalDescription(answer)
      onSignal({ kind: 'answer', from: role, callId: callIdRef.current, sdp: answer })
    } catch (e) {
      if (state !== 'permission-denied') cleanup('failed')
    }
  }, [chatId, callType, role, onSignal, getLocalMedia, createPeerConnection, state, cleanup])

  const rejectCall = useCallback(() => {
    onSignal({ kind: 'reject', from: role, callId: callIdRef.current })
    if (callIdRef.current) logCall('end', { callId: callIdRef.current, status: 'rejected' }).catch(() => {})
    cleanup('rejected')
  }, [onSignal, role, logCall, cleanup])

  const endCall = useCallback(() => {
    onSignal({ kind: 'end', from: role, callId: callIdRef.current })
    if (callIdRef.current) logCall('end', { callId: callIdRef.current, status: state === 'connected' ? 'completed' : 'missed' }).catch(() => {})
    cleanup('ended')
  }, [onSignal, role, logCall, state, cleanup])
  useEffect(() => { endCallRef.current = endCall }, [endCall])

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setLocalMuted(!track.enabled)
    onSignal({ kind: 'mute-state', from: role, callId: callIdRef.current, muted: !track.enabled })
  }, [onSignal, role])

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setLocalVideoOff(!track.enabled)
  }, [])

  // ── Speaker (output device) toggle ──────────────────────────────────────
  // Uses setSinkId where supported (most Android/desktop browsers) to route
  // audio to the loudspeaker vs. earpiece/default output. On browsers that
  // don't support setSinkId (notably iOS Safari), we still flip the flag so
  // the UI reflects intent and raise the element volume — actual earpiece/
  // speaker routing on iOS is controlled by the OS, not the page.
  const toggleSpeaker = useCallback(async () => {
    const next = !speakerOn
    setSpeakerOn(next)
    const el = remoteAudioEl.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null
    if (el?.setSinkId) {
      try {
        await el.setSinkId(next ? 'default' : 'communications')
      } catch {
        // Falls back silently — some browsers only expose a fixed set of sinks.
      }
    }
  }, [speakerOn])

  return {
    state, callType, error, remoteMuted, localMuted, localVideoOff, speakerOn, duration,
    localVideoEl: setLocalVideoEl, remoteVideoEl: setRemoteVideoEl, remoteAudioEl: setRemoteAudioEl,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleVideo, toggleSpeaker,
    handleSignal,
    // Video filters (seen by both sides), proximity-based screen dimming
    // for audio calls (where the browser supports it), and current filter id.
    videoFilter, applyVideoFilter, videoFilterOptions: Object.keys(VIDEO_FILTERS) as VideoFilterId[],
    proximitySupported, screenDimmed, dismissScreenDim: () => setScreenDimmed(false),
    // Minimize-to-bubble (works everywhere) + real OS Picture-in-Picture
    // (floats over other apps where the platform supports it).
    minimized, toggleMinimize, pipSupported, pipActive, requestPiP,
  }
}
