import { NextRequest, NextResponse } from 'next/server'
import { createUser, getUserByEmail, parseDevice, parseBrowser } from '@/lib/user-db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { first_name, last_name, email, phone, gender, role, password_hash,
      photo_data, exact_lat, exact_lng, location_accuracy } = body

    if (!first_name?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    if (!password_hash) return NextResponse.json({ error: 'Password is required' }, { status: 400 })

    // Check if user already exists
    const existing = await getUserByEmail(email)
    if (existing) return NextResponse.json({ error: 'An account with this email already exists. Please login.' }, { status: 409 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const ua = req.headers.get('user-agent') || ''

    let city = '', country = '', region = ''
    try {
      const geo = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,regionName`, { signal: AbortSignal.timeout(2000) })
      if (geo.ok) { const gd = await geo.json(); city = gd.city || ''; country = gd.country || ''; region = gd.regionName || '' }
    } catch {}

    const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
    const validRoles = ['Public', 'HR Manager', 'Developer']
    const safeRole = validRoles.includes(role) ? role : 'Public'

    // email_verified = true because OTP was already verified BEFORE this registration call
    await createUser({
      id, first_name: first_name.trim(), last_name: (last_name || '').trim(),
      email: email.toLowerCase().trim(), phone: (phone || '').trim(),
      gender: gender || '', role: safeRole, password_hash,
      photo_data: photo_data || '', exact_lat: exact_lat || null,
      exact_lng: exact_lng || null, location_accuracy: location_accuracy || null,
      ip, device: parseDevice(ua), browser: parseBrowser(ua),
      city, country, region,
      email_verified: true
    })

    return NextResponse.json({ success: true, userId: id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
