/**
 * POST /api/live-chat/media-upload?chatId=...&filename=...&type=image|video
 *
 * Uploads a view-once photo/video (including live camera captures) sent
 * inside a Live Chat conversation, for either side (visitor or admin).
 * Unlike /api/blob-upload this is NOT admin-only — a visitor also needs to
 * be able to send photos/videos to the admin.
 *
 * Authorization: the caller must either be the admin, or the request must
 * come from the same device that owns the chat (device-id cookie, same
 * mechanism used by the rest of the Live Chat API).
 */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@/lib/admin-auth'
import { CO_ADMIN_SESSION_COOKIE, verifyCoAdminToken } from '@/lib/co-admin-auth'
import { getOrCreateDeviceId, attachDeviceCookie } from '@/lib/device-id'

const sql = neon(process.env.DATABASE_URL!)
const SESSION_COOKIE = 'portfolio_admin_session'
const MAX_BYTES = 25 * 1024 * 1024 // 25MB — generous for a short view-once clip/photo

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  // Voice notes
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/aac',
])

function isAdminAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  if (cookie?.value && verifyToken(cookie.value)) return true
  const coCookie = req.cookies.get(CO_ADMIN_SESSION_COOKIE)
  const coPayload = coCookie?.value ? verifyCoAdminToken(coCookie.value) : null
  return !!coPayload && coPayload.permissions.includes('live_chat')
}

export async function POST(req: NextRequest) {
  try {
    const chatId = req.nextUrl.searchParams.get('chatId') || ''
    const filename = req.nextUrl.searchParams.get('filename') || `media_${Date.now()}`
    const kind = req.nextUrl.searchParams.get('type') === 'video' ? 'video'
      : req.nextUrl.searchParams.get('type') === 'audio' ? 'audio'
      : 'image'
    if (!chatId) return NextResponse.json({ error: 'Missing chatId' }, { status: 400 })

    const admin = isAdminAuthed(req)
    const { deviceId, isNew, token } = getOrCreateDeviceId(req)

    if (!admin) {
      const chatRow = (await sql`SELECT device_id, status FROM live_chats WHERE id = ${chatId}`)[0]
      if (!chatRow) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      if (chatRow.device_id && chatRow.device_id !== deviceId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      if (chatRow.status === 'closed') return NextResponse.json({ error: 'Chat has ended' }, { status: 409 })
    }

    const contentType = req.headers.get('content-type') || ''
    if (contentType && !ALLOWED_TYPES.has(contentType.split(';')[0].trim())) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
    }

    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength && contentLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (25MB max)' }, { status: 413 })
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    if (!blobToken) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN not configured. Please add it to your environment variables.' },
        { status: 503 }
      )
    }

    const body = req.body
    if (!body) return NextResponse.json({ error: 'No file body' }, { status: 400 })

    const { put } = await import('@vercel/blob')
    // Random-looking path so the URL itself isn't guessable — media is
    // meant to be view-once, so we don't want it easily re-discoverable.
    const rand = Math.random().toString(36).slice(2, 10)
    const blob = await put(`portfolio/live-chat/${chatId}/${Date.now()}_${rand}_${filename}`, body, {
      access: 'public',
      token: blobToken,
      contentType: contentType || undefined,
    })

    const res = NextResponse.json({ url: blob.url, mediaType: kind })
    return !admin && isNew ? attachDeviceCookie(res, token) : res
  } catch (e: any) {
    console.error('[live-chat/media-upload]', e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
