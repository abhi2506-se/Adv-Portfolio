'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JourneyMedia {
  id: string
  type: 'image' | 'video' | 'audio'
  name: string
  mimeType: string
  size: number
}

export interface JourneyProfile {
  bio: string
  name: string
  tagline: string
  mainProfileUrl: string   // professional profile photo (blob URL or '')
  journeyProfileUrl: string // adventure profile photo (blob URL or '')
  blueTick?: boolean         // admin toggleable blue verified tick
  followingCount?: number    // admin-editable following count
}

export interface Comment {
  id: string
  author: string
  text: string
  createdAt: number
}

export interface LikeData {
  count: number
  comments: Comment[]
  likedByMe?: boolean
}

export interface BlogPost {
  id: string
  title: string
  description: string
  caption: string          // AI-generated or manually edited social caption
  location: string
  experience: string
  date: string
  tags: string[]
  mediaIds: string[]
  coverMediaId: string
  audioId?: string
  audioName?: string
  audioStartTime?: number
  audioEndTime?: number
  createdAt: number
}

export interface Certificate {
  id: string
  title: string
  issuer: string
  date: string
  description: string
  category: string
  mediaId: string
  fileType: 'image' | 'pdf'
  fileName: string
  createdAt: number
}

// ─── Dispatch (same-tab reactivity) ──────────────────────────────────────────

function dispatch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('journey-data-updated'))
  }
}

// ─── Journey Profile API ──────────────────────────────────────────────────────

function defaultProfile(): JourneyProfile {
  return {
    bio: 'DevOps Engineer · Full Stack Developer · Explorer',
    name: 'Abhishek Singh',
    tagline: 'Capturing moments, building memories ✨',
    mainProfileUrl: '',
    journeyProfileUrl: '',
  }
}

export async function getJourneyProfile(): Promise<JourneyProfile> {
  try {
    const res = await fetch('/api/journey/profile', { cache: 'no-store' })
    if (!res.ok) return defaultProfile()
    return res.json()
  } catch { return defaultProfile() }
}

export async function saveJourneyProfile(profile: JourneyProfile): Promise<void> {
  await fetch('/api/journey/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  dispatch()
}

// ─── Likes & Comments API ─────────────────────────────────────────────────────

export async function getLikes(postId: string): Promise<LikeData> {
  try {
    const res = await fetch(`/api/journey/likes?postId=${encodeURIComponent(postId)}`, { cache: 'no-store' })
    if (!res.ok) return { count: 0, comments: [] }
    return res.json()
  } catch { return { count: 0, comments: [] } }
}

export async function toggleLike(postId: string): Promise<LikeData> {
  const res = await fetch('/api/journey/likes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, action: 'like' }),
  })
  return res.json()
}

export async function addComment(postId: string, author: string, text: string): Promise<LikeData> {
  const res = await fetch('/api/journey/likes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, action: 'comment', author, text }),
  })
  return res.json()
}

export async function deleteComment(postId: string, commentId: string): Promise<LikeData> {
  const res = await fetch('/api/journey/likes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, action: 'deleteComment', commentId }),
  })
  return res.json()
}

// ─── Blog API ─────────────────────────────────────────────────────────────────

export async function getBlogs(): Promise<BlogPost[]> {
  try {
    const res = await fetch('/api/journey/blogs', { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export async function saveBlog(post: BlogPost): Promise<void> {
  await fetch('/api/journey/blogs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  })
  dispatch()
}

export async function deleteBlog(id: string): Promise<void> {
  await fetch('/api/journey/blogs', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  dispatch()
}

export async function getBlogById(id: string): Promise<BlogPost | null> {
  const blogs = await getBlogs()
  return blogs.find(p => p.id === id) ?? null
}

// ─── Certificate API ──────────────────────────────────────────────────────────

export async function getCertificates(): Promise<Certificate[]> {
  try {
    const res = await fetch('/api/journey/certificates', { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export async function saveCertificate(cert: Certificate): Promise<void> {
  await fetch('/api/journey/certificates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cert),
  })
  dispatch()
}

export async function deleteCertificate(id: string): Promise<void> {
  await fetch('/api/journey/certificates', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  dispatch()
}

// ─── Media API ────────────────────────────────────────────────────────────────

export async function saveMedia(id: string, blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('id', id)
  formData.append('file', blob)

  const res = await fetch('/api/journey/media', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Media upload failed: ${err}`)
  }
  const json = await res.json()
  return json.url as string
}

export function getMediaUrl(id: string): Promise<string | null> {
  if (!id) return Promise.resolve(null)
  if (id.startsWith('http')) return Promise.resolve(id)
  return Promise.resolve(`/api/journey/media?id=${encodeURIComponent(id)}`)
}

export async function deleteMedia(id: string): Promise<void> {
  await fetch('/api/journey/media', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isVideoId(id: string): boolean {
  if (!id) return false
  if (id.includes('/blog_v_') || id.includes('/blog_v%')) return true
  if (id.includes('_v_')) return true
  return false
}

export function isAudioId(id: string): boolean {
  if (!id) return false
  if (id.includes('/blog_a_') || id.includes('/blog_a%')) return true
  if (id.includes('_a_')) return true
  return false
}

// ─── Story API ────────────────────────────────────────────────────────────────

export interface JourneyStory {
  id: string
  title: string
  label: string
  emoji: string
  media_id: string
  media_type: 'image' | 'video'
  created_at: number
}

export async function getStories(): Promise<JourneyStory[]> {
  try {
    const res = await fetch('/api/journey/stories', { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export async function saveStory(story: JourneyStory): Promise<void> {
  await fetch('/api/journey/stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(story),
  })
  dispatch()
}

export async function deleteStory(id: string): Promise<void> {
  await fetch('/api/journey/stories', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  dispatch()
}

// ─── Follow API ───────────────────────────────────────────────────────────────

export async function getFollowStatus(fingerprint: string): Promise<{ count: number; isFollowing: boolean }> {
  try {
    const res = await fetch(`/api/journey/follow?fingerprint=${encodeURIComponent(fingerprint)}`, { cache: 'no-store' })
    if (!res.ok) return { count: 0, isFollowing: false }
    return res.json()
  } catch { return { count: 0, isFollowing: false } }
}

export async function followAdmin(name: string, email: string, fingerprint: string): Promise<{ success: boolean; count: number; error?: string }> {
  const res = await fetch('/api/journey/follow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'follow', name, email, fingerprint }),
  })
  return res.json()
}

export async function unfollowAdmin(fingerprint: string): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/journey/follow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unfollow', fingerprint }),
  })
  return res.json()
}

export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return ''
  const stored = localStorage.getItem('__abhi_fp')
  if (stored) return stored
  const fp = `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${navigator.userAgent.length}`
  localStorage.setItem('__abhi_fp', fp)
  return fp
}
