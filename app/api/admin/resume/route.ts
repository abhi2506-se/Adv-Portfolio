import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

// POST /api/admin/resume  — multipart/form-data: file (PDF)
// Uploads the resume PDF to Vercel Blob and returns the public URL.
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          'Media storage is not configured. ' +
          'Please add BLOB_READ_WRITE_TOKEN to your environment variables. ' +
          'Get it from: Vercel Dashboard → Storage → Blob → your store → .env.local',
      },
      { status: 503 },
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Use a fixed name so each upload replaces the previous one in storage
    const blob = await put('resume/resume.pdf', file, {
      access: 'public',
      contentType: 'application/pdf',
      allowOverwrite: true,
    })

    return NextResponse.json({ success: true, url: blob.url })
  } catch (e) {
    console.error('POST /api/admin/resume error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
