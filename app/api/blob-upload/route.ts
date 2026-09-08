/**
 * POST /api/blob-upload
 * Uploads a file to Vercel Blob storage.
 * Falls back to a data-URL approach if blob is not configured.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireAdmin(req: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(`${req.nextUrl.origin}/api/admin/session-check`, {
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    if (!res.ok) return false
    const d = await res.json()
    return d.valid !== false
  } catch { return false }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const filename = req.nextUrl.searchParams.get('filename') || `upload_${Date.now()}`
    const projectId = req.nextUrl.searchParams.get('projectId') || 'general'
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN

    if (!blobToken) {
      // No blob token: return error — admin should configure BLOB_READ_WRITE_TOKEN
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN not configured. Please add it to your environment variables.' },
        { status: 503 }
      )
    }

    // Use Vercel Blob
    const { put } = await import('@vercel/blob')
    const body = req.body
    if (!body) return NextResponse.json({ error: 'No file body' }, { status: 400 })

    const blob = await put(`portfolio/projects/${projectId}/${filename}`, body, {
      access: 'public',
      token: blobToken,
    })

    return NextResponse.json({ url: blob.url, filename: blob.pathname })
  } catch (e: any) {
    console.error('[blob-upload]', e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
