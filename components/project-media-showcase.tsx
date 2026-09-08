'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Play, ZoomIn, Image as ImageIcon, Film, FileImage } from 'lucide-react'

interface MediaItem {
  id: string
  project_id: string
  media_type: 'image' | 'gif' | 'video'
  media_url: string
  thumbnail_url?: string
  title: string
  description: string
  display_order: number
  uploaded_at: string
}

interface Props {
  projectId: string
}

export default function ProjectMediaShowcase({ projectId }: Props) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)

  useEffect(() => {
    fetch(`/api/admin/project-media?projectId=${projectId}`)
      .then(r => r.json())
      .then(d => setMedia((d.media || []).sort((a: MediaItem, b: MediaItem) => a.display_order - b.display_order)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightbox) {
        if (e.key === 'Escape') setLightbox(null)
        if (e.key === 'ArrowLeft') prevLightbox()
        if (e.key === 'ArrowRight') nextLightbox()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  if (loading || media.length === 0) return null

  const prevSlide = () => setCurrent(c => (c - 1 + media.length) % media.length)
  const nextSlide = () => setCurrent(c => (c + 1) % media.length)

  const lightboxIdx = lightbox ? media.findIndex(m => m.id === lightbox.id) : -1
  const prevLightbox = () => {
    const idx = (lightboxIdx - 1 + media.length) % media.length
    setLightbox(media[idx])
  }
  const nextLightbox = () => {
    const idx = (lightboxIdx + 1) % media.length
    setLightbox(media[idx])
  }

  return (
    <section className="w-full">
      {/* Hero carousel - mobile responsive */}
      <div className="relative rounded-lg md:rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800/60 group">
        {/* Main display */}
        <div className="relative aspect-video">
          <AnimatePresence mode="wait">
            <motion.div
              key={media[current]?.id}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className={`absolute inset-0 flex items-center justify-center ${
                media[current]?.media_type === 'image' ? 'bg-transparent' : 'bg-black'
              }`}
            >
              {media[current]?.media_type === 'video' ? (
                <video
                  src={media[current].media_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  controlsList="nodownload"
                  onContextMenu={e => e.preventDefault()}
                />
              ) : media[current]?.media_type === 'gif' ? (
                // Display GIF as video for better support
                <video
                  src={media[current].media_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controlsList="nodownload"
                  onContextMenu={e => e.preventDefault()}
                />
              ) : (
                // Regular image - FULL DISPLAY, NO OVERLAYS
                <img
                  src={media[current]?.media_url}
                  alt={media[current]?.title || 'Project media'}
                  className="w-full h-full object-contain select-none"
                  onContextMenu={e => e.preventDefault()}
                  draggable={false}
                  loading="lazy"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Gradient overlay - ONLY for videos and GIFs, NOT on mobile, NOT for images */}
          {media[current]?.media_type !== 'image' && media[current]?.media_type !== 'video' && (media[current]?.title || media[current]?.description) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none hidden md:block" />
          )}

          {/* Navigation arrows - hide on mobile */}
          {media.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-8 md:w-9 h-8 md:h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
              >
                <ChevronLeft className="w-3 md:w-4 h-3 md:h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-8 md:w-9 h-8 md:h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
              >
                <ChevronRight className="w-3 md:w-4 h-3 md:h-4" />
              </button>
            </>
          )}

          {/* Expand button - always visible on mobile */}
          <button
            onClick={() => setLightbox(media[current])}
            className="absolute top-2 md:top-3 right-2 md:right-3 w-7 md:w-8 h-7 md:h-8 rounded-lg bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20 hidden md:flex"
          >
            <ZoomIn className="w-3 md:w-3.5 h-3 md:h-3.5" />
          </button>

          {/* Caption - HIDDEN for videos/GIFs on mobile, only show text as overlay for descriptions */}
          {media[current]?.media_type !== 'image' && media[current]?.description && (
            <div className="absolute bottom-0 left-0 right-0 p-3 hidden md:block">
              {media[current].description && (
                <p className="text-white/70 text-xs">{media[current].description}</p>
              )}
            </div>
          )}
          
          {/* Clickable overlay for full screen video/gif */}
          {media[current]?.media_type !== 'image' && (
            <button
              onClick={() => setLightbox(media[current])}
              className="absolute inset-0 cursor-pointer hover:bg-black/10 transition-colors z-10"
              aria-label="Open full screen"
            />
          )}
          
          {/* Clickable overlay for full screen images */}
          {media[current]?.media_type === 'image' && (
            <button
              onClick={() => setLightbox(media[current])}
              className="absolute inset-0 cursor-pointer hover:bg-white/5 transition-colors z-10"
              aria-label="Open full screen"
            />
          )}

          {/* Dot indicator - mobile adjusted */}
          {media.length > 1 && (
            <div className="absolute bottom-12 md:bottom-3 right-2 md:right-4 flex gap-1 md:gap-1.5 z-10">
              {media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all ${i === current ? 'w-4 md:w-5 h-1 md:h-1.5 bg-white' : 'w-1 md:w-1.5 h-1 md:h-1.5 bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip - responsive sizes */}
        {media.length > 1 && (
          <div className="flex gap-1 md:gap-2 p-2 md:p-3 overflow-x-auto scrollbar-hide bg-slate-800/30">
            {media.map((item, idx) => (
              <motion.button
                key={item.id}
                onClick={() => setCurrent(idx)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className={`flex-shrink-0 w-12 h-9 md:w-16 md:h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === current ? 'border-blue-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                {item.media_type === 'video' || item.media_type === 'gif' ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <Play className="w-3 md:w-4 h-3 md:h-4 text-orange-400" />
                  </div>
                ) : (
                  <img
                    src={item.thumbnail_url || item.media_url}
                    alt={item.title}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                    onContextMenu={e => e.preventDefault()}
                  />
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Image Caption Display - Show below carousel without overlaying */}
      {media[current]?.media_type === 'image' && (media[current]?.title || media[current]?.description) && (
        <div className="mt-4 p-4 bg-slate-900/40 rounded-lg border border-slate-800/60">
          {media[current].title && (
            <p className="text-white font-semibold text-sm">{media[current].title}</p>
          )}
          {media[current].description && (
            <p className="text-white/70 text-xs mt-2">{media[current].description}</p>
          )}
        </div>
      )}

      {/* Lightbox - Fixed position for smooth zoom without scrolling */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setLightbox(null)}
            style={{ height: '100vh', width: '100vw' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative w-full h-full max-w-6xl max-h-screen flex flex-col justify-center items-center"
              onClick={e => e.stopPropagation()}
            >
              {/* Lightbox header - fixed at top */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 md:p-4 flex-wrap gap-2 z-30 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex-1 min-w-0">
                  {lightbox.title && <p className="text-white font-semibold text-sm md:text-base truncate">{lightbox.title}</p>}
                  {lightbox.description && <p className="text-white/60 text-xs md:text-sm truncate">{lightbox.description}</p>}
                </div>
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                  {media.length > 1 && (
                    <span className="text-white/40 text-xs md:text-sm">{lightboxIdx + 1} / {media.length}</span>
                  )}
                  <button onClick={() => setLightbox(null)} className="p-1.5 md:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0">
                    <X className="w-4 md:w-5 h-4 md:h-5" />
                  </button>
                </div>
              </div>

              {/* Lightbox media - centered in viewport */}
              <div className="relative w-full h-full max-w-6xl max-h-[85vh] rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                {lightbox.media_type === 'video' || lightbox.media_type === 'gif' ? (
                  <video
                    src={lightbox.media_url}
                    controls={lightbox.media_type === 'video'}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                    controlsList="nodownload"
                    onContextMenu={e => e.preventDefault()}
                  />
                ) : (
                  <img
                    src={lightbox.media_url}
                    alt={lightbox.title}
                    className="w-full h-full object-contain select-none"
                    onContextMenu={e => e.preventDefault()}
                    draggable={false}
                  />
                )}
              </div>

              {/* Navigation - positioned absolutely on sides */}
              {media.length > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); prevLightbox() }}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 md:w-12 h-10 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-20"
                  >
                    <ChevronLeft className="w-5 md:w-6 h-5 md:h-6" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); nextLightbox() }}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 md:w-12 h-10 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-20"
                  >
                    <ChevronRight className="w-5 md:w-6 h-5 md:h-6" />
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
