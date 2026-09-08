/**
 * GET /api/maintenance
 * Lightweight public endpoint polled by the MaintenanceGuard component.
 * Returns { active: boolean, message: string } — no auth required.
 * Cached for 4 seconds so rapid polls don't hammer the DB.
 */
import { NextResponse } from 'next/server'
import { dbGetSettings } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const settings = await dbGetSettings()
    const active  = settings['maintenance_mode'] === 'true'
    const message = settings['maintenance_message'] || "We're upgrading things. Back soon! 🚀"
    return NextResponse.json(
      { active, message },
      {
        headers: {
          // Short cache so changes propagate within ~5s
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch {
    // On DB errors, never block users from the site
    return NextResponse.json({ active: false, message: '' })
  }
}
