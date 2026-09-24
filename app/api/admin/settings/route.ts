import { NextResponse } from 'next/server'
import { dbGetSettings, dbSetSettings } from '@/lib/db'

export async function GET() {
  try {
    const settings = await dbGetSettings()
    return NextResponse.json({ settings })
  } catch (e) {
    console.error('[settings] get error:', e)
    return NextResponse.json({ settings: {} })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Support nested { settings: {...} } or flat object
    const input = body.settings ?? body
    const allowed = [
      'whatsapp_number',
      'calendly_url',
      'hire_email_enabled',
      'resend_api_key',
      'notify_email',
      'resend_from_email',
      'chatbot_name',
      'chatbot_personal_details',
      'resume_url',
      'current_location',
      'maintenance_mode',
      'maintenance_message',
      'privacy_policy',
      'terms_of_service',
      // Version / changelog
      'site_version',
      'site_changes',
      // Social media settings
      'GITHUB_USERNAME',
      'INSTAGRAM_USERNAME',
      'INSTAGRAM_FOLLOWERS_FALLBACK',
      'LINKEDIN_FOLLOWERS',
      'TWITTER_FOLLOWERS',
      // Meeting scheduler v2
      'meeting_timezone',
      // Live chat behaviour
      'live_chat_mobile_fullscreen',
    ]
    const filtered: Record<string, string> = {}
    for (const key of allowed) {
      if (key in input) filtered[key] = String(input[key])
    }
    await dbSetSettings(filtered)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[settings] save error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
