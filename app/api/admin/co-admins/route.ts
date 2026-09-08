export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@/lib/admin-auth'
import {
  listCoAdmins, createCoAdmin, updateCoAdmin, setCoAdminEnabled, unblockCoAdmin,
  deleteCoAdmin, getCoAdminActivity, PERMISSION_KEYS, PERMISSION_LABELS, RELATIONS,
} from '@/lib/co-admin-db'

function isRealAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  return !!token && verifyToken(token)
}

export async function GET(req: NextRequest) {
  if (!isRealAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  if (searchParams.get('activity') === '1') {
    const activity = await getCoAdminActivity(150)
    return NextResponse.json({ activity })
  }
  const coAdmins = await listCoAdmins()
  return NextResponse.json({ coAdmins, permissionKeys: PERMISSION_KEYS, permissionLabels: PERMISSION_LABELS, relations: RELATIONS })
}

export async function POST(req: NextRequest) {
  if (!isRealAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, username, password, relation, securityQuestion, securityAnswer, permissions } = body
    if (!name || !username || !password || !relation || !securityQuestion || !securityAnswer) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (!Array.isArray(permissions)) return NextResponse.json({ error: 'permissions must be an array' }, { status: 400 })
    const { id } = await createCoAdmin({ name, username, password, relation, securityQuestion, securityAnswer, permissions })
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create co-admin' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isRealAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { id, action } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    if (action === 'enable') { await setCoAdminEnabled(id, true); return NextResponse.json({ ok: true }) }
    if (action === 'disable') { await setCoAdminEnabled(id, false); return NextResponse.json({ ok: true }) }
    if (action === 'unblock') { await unblockCoAdmin(id); return NextResponse.json({ ok: true }) }

    // Generic field update (name/relation/permissions/password/security Q&A)
    const { name, relation, permissions, password, securityQuestion, securityAnswer } = body
    await updateCoAdmin(id, { name, relation, permissions, password, securityQuestion, securityAnswer })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update co-admin' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isRealAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteCoAdmin(id)
  return NextResponse.json({ ok: true })
}
