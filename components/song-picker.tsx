'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Music, X, Play, Pause, Search, Check, Clock, Loader2, ExternalLink } from 'lucide-react'

// Categories for iTunes search
const CATEGORIES = [
  { id: 'haryanvi', label: 'Haryanvi', emoji: '🌾', color: 'from-yellow-500 to-orange-500', term: 'haryanvi songs masoom sharma sapna choudhary' },
  { id: 'punjabi', label: 'Punjabi', emoji: '🎤', color: 'from-orange-500 to-red-500', term: 'punjabi songs diljit dosanjh karan aujla ap dhillon' },
  { id: 'bollywood', label: 'Bollywood', emoji: '🎬', color: 'from-pink-500 to-rose-500', term: 'bollywood hindi songs arijit singh shreya ghoshal' },
  { id: 'hollywood', label: 'Hollywood', emoji: '🌟', color: 'from-blue-500 to-purple-500', term: 'pop hits english songs the weeknd ed sheeran taylor swift' },
  { id: 'bhajan', label: 'Bhajan', emoji: '🙏', color: 'from-orange-400 to-amber-400', term: 'bhajan devotional hindi lata mangeshkar anuradha paudwal' },
  { id: 'old', label: 'Old Songs', emoji: '🕰️', color: 'from-amber-500 to-yellow-500', term: 'classic bollywood songs kishore kumar lata mangeshkar 90s' },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

interface iTunesSong {
  trackId: number
  trackName: string
  artistName: string
  previewUrl: string
  trackTimeMillis: number
  artworkUrl100: string
  collectionName: string
}

export interface SelectedSong {
  song: { id: string; title: string; artist: string; previewUrl: string; duration: number; artwork: string }
  startTime: number
  endTime: number
}

interface SongPickerProps {
  onSelect: (selection: SelectedSong) => void
  onClose: () => void
  currentSongId?: string
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// TrimBar — drag handles to select a clip window
function TrimBar({ duration, startTime, endTime, currentTime, onChange }: {
  duration: number; startTime: number; endTime: number; currentTime: number
  onChange: (s: number, e: number) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'start' | 'end' | 'window' | null>(null)
  const dragStart = useRef(0)
  const dragStartValues = useRef({ start: 0, end: 0 })
  const toPercent = (t: number) => (t / duration) * 100

  const onPointerDown = (e: React.PointerEvent, which: 'start' | 'end' | 'window') => {
    e.preventDefault()
    dragging.current = which
    dragStart.current = e.clientX
    dragStartValues.current = { start: startTime, end: endTime }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const delta = ((e.clientX - dragStart.current) / rect.width) * duration
    const { start, end } = dragStartValues.current
    const win = end - start
    if (dragging.current === 'start') onChange(Math.max(0, Math.min(start + delta, end - 5)), end)
    else if (dragging.current === 'end') onChange(start, Math.min(duration, Math.max(end + delta, start + 5)))
    else { const ns = Math.max(0, Math.min(start + delta, duration - win)); onChange(ns, ns + win) }
  }

  return (
    <div ref={barRef} className="relative h-12 rounded-xl overflow-hidden select-none cursor-pointer"
      onPointerMove={onPointerMove} onPointerUp={() => { dragging.current = null }}>
      <div className="absolute inset-0 flex items-center gap-0.5 px-1 bg-slate-800/80">
        {Array.from({ length: 60 }).map((_, i) => {
          const h = 20 + Math.sin(i * 0.7) * 10 + Math.cos(i * 1.3) * 8
          return <div key={i} className="flex-1 rounded-full bg-slate-600/60" style={{ height: `${h}%` }} />
        })}
      </div>
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-y-0 border-y-2 border-rose-500"
        style={{ left: `${toPercent(startTime)}%`, right: `${100 - toPercent(endTime)}%` }}>
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-rose-500 flex items-center justify-center cursor-ew-resize rounded-l-sm"
          onPointerDown={e => onPointerDown(e, 'start')}>
          <div className="w-0.5 h-5 bg-white rounded-full" />
        </div>
        <div className="absolute inset-x-4 inset-y-0 cursor-grab active:cursor-grabbing"
          onPointerDown={e => onPointerDown(e, 'window')} />
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-rose-500 flex items-center justify-center cursor-ew-resize rounded-r-sm"
          onPointerDown={e => onPointerDown(e, 'end')}>
          <div className="w-0.5 h-5 bg-white rounded-full" />
        </div>
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
        style={{ left: `${toPercent(currentTime)}%` }} />
    </div>
  )
}

export function SongPicker({ onSelect, onClose, currentSongId }: SongPickerProps) {
  const [category, setCategory] = useState<CategoryId>('bollywood')
  const [search, setSearch] = useState('')
  const [songs, setSongs] = useState<iTunesSong[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSong, setSelectedSong] = useState<iTunesSong | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(15)
  const [mounted, setMounted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number>(0)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Fetch from iTunes when category/search changes
  const fetchSongs = useCallback(async (cat: CategoryId, q: string) => {
    setLoading(true)
    try {
      const catObj = CATEGORIES.find(c => c.id === cat)!
      const term = q.trim() ? `${q} ${cat === 'haryanvi' ? 'haryanvi' : cat === 'punjabi' ? 'punjabi' : cat === 'bhajan' ? 'bhajan devotional' : ''}`.trim() : catObj.term
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&media=music&limit=25&explicit=no`
      const res = await fetch(url)
      const data = await res.json()
      // Filter to songs that have a preview URL (30s vocal clip)
      const filtered = (data.results as iTunesSong[]).filter(s => s.previewUrl)
      setSongs(filtered)
    } catch {
      setSongs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => fetchSongs(category, search), 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [category, search, fetchSongs])

  const tick = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
    if (audio.currentTime >= endTime) audio.currentTime = startTime
    rafRef.current = requestAnimationFrame(tick)
  }, [endTime, startTime])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    audioRef.current?.pause()
  }, [])

  const playSong = async (song: iTunesSong) => {
    cancelAnimationFrame(rafRef.current)
    audioRef.current?.pause()
    const audio = new Audio(song.previewUrl)
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio
    setSelectedSong(song)
    const dur = (song.trackTimeMillis || 30000) / 1000
    setStartTime(0)
    setEndTime(Math.min(15, dur))
    setCurrentTime(0)
    try {
      await audio.play()
      setPlaying(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch { setPlaying(false) }
  }

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !selectedSong) return
    if (playing) {
      audio.pause()
      cancelAnimationFrame(rafRef.current)
      setPlaying(false)
    } else {
      audio.currentTime = startTime
      await audio.play().catch(() => {})
      setPlaying(true)
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  const handleTrimChange = (start: number, end: number) => {
    setStartTime(start)
    setEndTime(end)
    if (audioRef.current) audioRef.current.currentTime = start
  }

  const handleConfirm = () => {
    if (!selectedSong) return
    onSelect({
      song: {
        id: String(selectedSong.trackId),
        title: selectedSong.trackName,
        artist: selectedSong.artistName,
        previewUrl: selectedSong.previewUrl,
        duration: (selectedSong.trackTimeMillis || 30000) / 1000,
        artwork: selectedSong.artworkUrl100,
      },
      startTime,
      endTime,
    })
  }

  const catObj = CATEGORIES.find(c => c.id === category)!

  const picker = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full sm:max-w-lg bg-slate-900 sm:rounded-2xl rounded-t-2xl border border-slate-700/50 shadow-2xl flex flex-col"
          style={{ maxHeight: '90vh', overflow: 'hidden' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-600 to-orange-500">
                <Music className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Add Music</p>
                <p className="text-xs text-slate-400">Real songs with vocals • iTunes previews</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pt-4 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search songs, artists…"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-none flex-shrink-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); setSearch('') }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  category === cat.id
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                <span>{cat.emoji}</span>{cat.label}
              </button>
            ))}
          </div>

          {/* Song list — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-1.5 min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-rose-400" />
                <p className="text-sm">Loading {catObj.label} songs…</p>
              </div>
            ) : songs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No songs found. Try a different search.</div>
            ) : songs.map(song => (
              <motion.button
                key={song.trackId}
                onClick={() => playSong(song)}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  selectedSong?.trackId === song.trackId
                    ? 'bg-rose-500/15 border border-rose-500/30'
                    : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                }`}
              >
                {/* Artwork */}
                <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-slate-700 relative">
                  {song.artworkUrl100 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={song.artworkUrl100} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${catObj.color} flex items-center justify-center text-lg`}>
                      {catObj.emoji}
                    </div>
                  )}
                  {selectedSong?.trackId === song.trackId && (
                    <div className="absolute inset-0 bg-rose-500/80 flex items-center justify-center">
                      {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{song.trackName}</p>
                  <p className="text-xs text-slate-400 truncate">{song.artistName}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-500">{formatTime((song.trackTimeMillis || 30000) / 1000)}</span>
                  {currentSongId === String(song.trackId) && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </motion.button>
            ))}
            {songs.length > 0 && (
              <p className="text-center text-xs text-slate-600 pt-2 flex items-center justify-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Previews via iTunes · 30-second vocal clips
              </p>
            )}
          </div>

          {/* Trim panel — ALWAYS fixed at bottom, never scrolls away */}
          <AnimatePresence>
            {selectedSong && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-700/50 bg-slate-900 flex-shrink-0"
                style={{ overflow: 'hidden' }}
              >
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <button onClick={togglePlay}
                      className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0 hover:bg-rose-400 transition-colors">
                      {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{selectedSong.trackName}</p>
                      <p className="text-xs text-slate-400 truncate">{selectedSong.artistName}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(startTime)} – {formatTime(endTime)}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">Drag handles to select your clip</p>
                    <TrimBar
                      duration={(selectedSong.trackTimeMillis || 30000) / 1000}
                      startTime={startTime}
                      endTime={endTime}
                      currentTime={currentTime}
                      onChange={handleTrimChange}
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>0:00</span>
                      <span>{formatTime((selectedSong.trackTimeMillis || 30000) / 1000)}</span>
                    </div>
                  </div>

                  <button onClick={handleConfirm}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white text-sm font-semibold transition-all shadow-lg">
                    <Check className="w-4 h-4" />
                    Use this clip ({formatTime(endTime - startTime)})
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  // Render via portal so it's always outside scroll context
  if (!mounted) return null
  return createPortal(picker, document.body)
}
