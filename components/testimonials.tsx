'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Quote, Star, Linkedin, Plus, X, Upload, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react'

interface Testimonial {
  id: string
  name: string
  job_title: string
  company: string
  text: string
  photo_url: string
  rating: number
  linkedin_url: string
  status: string
  created_at: number
  submitted_at?: number
  blue_tick?: boolean
}

const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Rajiv Mehta',
    job_title: 'Engineering Manager',
    company: 'Ksolves India Limited',
    text: "Abhishek consistently delivered high-quality React components ahead of schedule. His attention to UI detail and ability to translate Figma designs pixel-perfectly made him stand out. He proactively fixed edge cases we hadn't even spec'd out.",
    photo_url: '',
    rating: 5,
    linkedin_url: '',
    status: 'approved',
    created_at: Date.now(),
    submitted_at: Date.now(),
    blue_tick: false,
  },
  {
    id: '2',
    name: 'Priya Sharma',
    job_title: 'Senior Frontend Developer',
    company: 'Ksolves India Limited',
    text: "Working alongside Abhishek was a pleasure. He picked up our internal toolchain in days, not weeks, and was always the first to volunteer for challenging tasks. His Redux state management work significantly reduced our data-fetching bugs.",
    photo_url: '',
    rating: 5,
    linkedin_url: '',
    status: 'approved',
    created_at: Date.now(),
    submitted_at: Date.now(),
    blue_tick: false,
  },
  {
    id: '3',
    name: 'Ankit Verma',
    job_title: 'Tech Lead',
    company: 'Amazon Development Center India',
    text: "Abhishek demonstrated strong ownership of his deliverables at Amazon. The 35% rendering efficiency boost he achieved on our dashboard components was measurable and meaningful. He communicates blockers early and collaborates well under pressure.",
    photo_url: '',
    rating: 5,
    linkedin_url: '',
    status: 'approved',
    created_at: Date.now(),
    submitted_at: Date.now(),
    blue_tick: false,
  },
]

const GRADIENT_COLORS = [
  'from-blue-600 to-cyan-500',
  'from-purple-600 to-pink-500',
  'from-orange-600 to-red-500',
  'from-green-600 to-teal-500',
  'from-sky-600 to-blue-500',
  'from-indigo-600 to-violet-500',
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getGradient(name: string) {
  const idx = name.charCodeAt(0) % GRADIENT_COLORS.length
  return GRADIENT_COLORS[idx]
}

/** Instagram-style blue verification tick SVG */
function BlueTick({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-label="Verified"
      className="flex-shrink-0"
    >
      <path
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.774-1.044.907-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
        fill="#1d9bf0"
      />
    </svg>
  )
}

/** Format a timestamp to human-readable date + time */
function formatSubmittedAt(ts?: number | string): string {
  if (!ts) return ''
  // Ensure we convert to number in case it comes as string
  const timestamp = typeof ts === 'string' ? Number(ts) : ts
  if (isNaN(timestamp) || timestamp === 0) return ''
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

interface InlineFormProps {
  onClose: () => void
  onSuccess: () => void
}

function InlineSubmitForm({ onClose, onSuccess }: InlineFormProps) {
  const [form, setForm] = useState({ name: '', job_title: '', company: '', text: '', linkedin_url: '', rating: 5 })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Photo must be under 2MB'); return }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.job_title.trim() || !form.company.trim() || !form.text.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.text.trim().length < 30) {
      setError('Testimonial must be at least 30 characters.')
      return
    }
    // Photo is now mandatory
    if (!photoPreview) {
      setError('Please upload your profile photo. It is required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photo_url: photoPreview }),
      })
      const data = await res.json()
      if (data.ok) {
        setSuccess(true)
        setTimeout(() => { onSuccess(); onClose() }, 2000)
      } else {
        setError(data.error || 'Failed to submit. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      ref={formRef}
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full bg-card border border-blue-500/30 rounded-2xl shadow-xl overflow-hidden mb-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-blue-600/10 to-cyan-500/10">
        <div>
          <h3 className="font-bold text-lg">Share Your Experience</h3>
          <p className="text-xs text-muted-foreground">Your testimonial will be reviewed before publishing</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {success ? (
        <div className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h4 className="font-bold text-lg mb-1">Thank You!</h4>
          <p className="text-sm text-muted-foreground">Your testimonial has been submitted and is pending approval. It will go live once reviewed.</p>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {/* Photo upload — REQUIRED */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/50" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-red-400/60">
                  <Upload className="w-5 h-5 text-red-400/70" />
                </div>
              )}
              <label className="absolute inset-0 cursor-pointer rounded-full" title="Upload photo (required)">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium">
                Profile Photo <span className="text-red-500 font-semibold">*</span>
                <span className="text-xs text-muted-foreground ml-1">(required)</span>
              </p>
              <p className="text-xs text-muted-foreground">Click to upload · Max 2MB</p>
              {!photoPreview && (
                <p className="text-xs text-red-400 mt-0.5">Please upload your photo to continue</p>
              )}
            </div>
          </div>

          {/* Star rating */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rating *</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => set('rating', s)} className="transition-transform hover:scale-110">
                  <Star className={`w-6 h-6 ${s <= form.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="John Smith"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Current Job Title *</label>
              <input
                value={form.job_title}
                onChange={e => set('job_title', e.target.value)}
                placeholder="Senior Software Engineer"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Company Name *</label>
              <input
                value={form.company}
                onChange={e => set('company', e.target.value)}
                placeholder="Acme Corp"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">LinkedIn Profile <span className="text-muted-foreground">(optional)</span></label>
              <input
                value={form.linkedin_url}
                onChange={e => set('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/yourname"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
            </div>
          </div>

          {/* Testimonial text */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Your Testimonial *</label>
            <textarea
              value={form.text}
              onChange={e => set('text', e.target.value)}
              rows={4}
              placeholder="Share your experience working with or knowing this person..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{form.text.length}/500 characters (min 30)</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Testimonial'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export function Testimonials() {
  const ref = useRef(null)
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [usingDefault, setUsingDefault] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetchTestimonials = async () => {
    try {
      const res = await fetch('/api/testimonials', { cache: 'no-store' })
      const data = await res.json()
      if (data.testimonials && data.testimonials.length > 0) {
        setTestimonials(data.testimonials)
        setUsingDefault(false)
      } else {
        setTestimonials(defaultTestimonials)
        setUsingDefault(true)
      }
    } catch {
      setTestimonials(defaultTestimonials)
      setUsingDefault(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const handleAddClick = () => {
    setShowForm(true)
    setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }
  const card = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } } }

  return (
    <motion.section
      ref={(el) => {
        ;(ref as any).current = el
        ;(sectionRef as any).current = el
      }}
      id="testimonials"
      className="py-20 md:py-32 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto"
      variants={container} initial="hidden" animate={inView ? 'visible' : 'hidden'}
    >
      <motion.div variants={card} className="mb-4 flex items-start justify-between flex-wrap gap-4">
        <div>
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Social Proof</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2">
            What People{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Say</span>
          </h2>
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-4"
          >
            <Plus className="w-4 h-4" />
            Add Testimonial
          </button>
        )}
      </motion.div>
      <motion.p variants={card} className="text-muted-foreground text-lg mb-10 max-w-2xl">
        Feedback from managers, team leads, and colleagues I've had the privilege of working with.
      </motion.p>

      {/* Inline form */}
      <AnimatePresence>
        {showForm && (
          <InlineSubmitForm
            onClose={() => setShowForm(false)}
            onSuccess={fetchTestimonials}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse space-y-3">
              <div className="h-4 bg-secondary rounded w-1/3" />
              <div className="h-3 bg-secondary rounded w-full" />
              <div className="h-3 bg-secondary rounded w-5/6" />
              <div className="flex items-center gap-3 pt-3">
                <div className="w-10 h-10 rounded-full bg-secondary" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-secondary rounded w-1/2" />
                  <div className="h-2.5 bg-secondary rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 w-full min-w-0">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id || i}
              variants={card}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-lg hover:border-blue-500/30 transition-all duration-300 w-full min-w-0 overflow-hidden"
            >
              <Quote className="w-8 h-8 text-blue-600/20 absolute top-4 right-4" />

              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating || 5 }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>

              {/* Text */}
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 break-words">"{t.text}"</p>

              {/* Submitted date/time — theme-aware so it stays readable in both light and dark mode */}
              {(t.submitted_at || t.created_at) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 pt-1 min-w-0">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-foreground/70 font-medium truncate">
                    {formatSubmittedAt(t.submitted_at || t.created_at) || 'Recently submitted'}
                  </span>
                </div>
              )}

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-border min-w-0">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-border" />
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGradient(t.name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {getInitials(t.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-semibold text-sm truncate min-w-0">{t.name}</p>
                    {/* Blue verified tick */}
                    {t.blue_tick && <BlueTick size={15} />}
                    {t.linkedin_url && (
                      <a href={t.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 flex-shrink-0">
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.job_title} · {t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  )
}

function Linkedin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}
