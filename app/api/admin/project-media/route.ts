/**
 * /api/admin/project-media
 * GET    — list media for a project (?projectId=xxx) or all projects
 * POST   — upload/create a media item
 * PATCH  — update title/description/order
 * DELETE — remove a media item
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  dbCreateProjectMedia, dbGetProjectMedia, dbGetAllProjectMedia,
  dbUpdateProjectMedia, dbDeleteProjectMedia, dbReorderProjectMedia,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

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

/* ── GET ────────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  try {
    const rows = projectId
      ? await dbGetProjectMedia(projectId)
      : await dbGetAllProjectMedia()
    return NextResponse.json({ media: rows })
  } catch (e) {
    console.error('[project-media GET]', e)
    return NextResponse.json({ media: [] })
  }
}

/* ── POST ───────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { project_id, media_type, media_url, thumbnail_url, title, description, display_order } = body
    if (!project_id || !media_url) {
      return NextResponse.json({ error: 'project_id and media_url are required' }, { status: 400 })
    }
    const validTypes = ['image', 'gif', 'video']
    const item = await dbCreateProjectMedia({
      project_id,
      media_type: validTypes.includes(media_type) ? media_type : 'image',
      media_url,
      thumbnail_url: thumbnail_url || undefined,
      title: title || '',
      description: description || '',
      display_order: typeof display_order === 'number' ? display_order : 0,
    })
    return NextResponse.json({ ok: true, item }, { status: 201 })
  } catch (e) {
    console.error('[project-media POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* ── PATCH ──────────────────────────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()

    // Batch reorder: [{ id, display_order }]
    if (Array.isArray(body)) {
      await dbReorderProjectMedia(body)
      return NextResponse.json({ ok: true })
    }

    const { id, title, description, display_order, thumbnail_url } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await dbUpdateProjectMedia(id, { title, description, display_order, thumbnail_url })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[project-media PATCH]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* ── DELETE ─────────────────────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await dbDeleteProjectMedia(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[project-media DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
