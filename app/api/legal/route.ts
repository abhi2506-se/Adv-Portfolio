import { NextResponse } from 'next/server'
import { dbGetSettings } from '@/lib/db'

export async function GET() {
  try {
    const settings = await dbGetSettings()
    return NextResponse.json({
      privacy_policy: settings.privacy_policy ?? '',
      terms_of_service: settings.terms_of_service ?? '',
    })
  } catch (e) {
    console.error('[legal] get error:', e)
    return NextResponse.json({ privacy_policy: '', terms_of_service: '' })
  }
}
