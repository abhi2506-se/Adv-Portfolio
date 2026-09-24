import { NextResponse } from 'next/server'
import { put, del, head } from '@vercel/blob'



// GET /api/journey/media?id=xxx
// The id IS the Vercel Blob URL (full https://... url stored as the mediaId)
// We redirect to it — Vercel Blob handles serving with CDN + correct headers
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('id')
  if (!url) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // If it's already a full URL (Vercel Blob), redirect to it
  if (url.startsWith('http')) {
    return NextResponse.redirect(url)
  }

  return NextResponse.json({ error: 'Invalid media id' }, { status: 404 })
}

// POST /api/journey/media  — multipart/form-data: id + file
export async function POST(req: Request) {
  // Fail fast with a clear message if the Vercel Blob token is not configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      'BLOB_READ_WRITE_TOKEN is not set. ' +
      'Add it to .env.local (local dev) or Vercel → Settings → Environment Variables (production).'
    )
    return NextResponse.json(
      {
        error:
          'Media storage is not configured. ' +
          'Please add BLOB_READ_WRITE_TOKEN to your environment variables. ' +
          'Get it from: Vercel Dashboard → Storage → Blob → your store → .env.local',
      },
      { status: 503 }
    )
  }

  try {
    const formData = await req.formData()
    const id = formData.get('id') as string
    const file = formData.get('file') as File

    if (!id || !file) {
      return NextResponse.json({ error: 'Missing id or file' }, { status: 400 })
    }

    // Upload to Vercel Blob — the blob URL becomes the permanent media identifier
    const blob = await put(`journey/${id}`, file, {
      access: 'public',
      contentType: file.type,
    })

    // Return the blob URL as the "url" so the client can store it as mediaId
    return NextResponse.json({ success: true, id, url: blob.url })
  } catch (e) {
    console.error('POST /api/journey/media error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE /api/journey/media — { id: "https://blob.vercel-storage.com/..." }
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    if (id && id.startsWith('http')) {
      await del(id)
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/journey/media error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
