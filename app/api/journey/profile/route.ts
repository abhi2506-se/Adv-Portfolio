import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS journey_profile (
      key   TEXT PRIMARY KEY,
      data  JSONB NOT NULL
    )
  `
}

export async function GET() {
  try {
    await ensureTable()
    const rows = await sql`SELECT data FROM journey_profile WHERE key = 'main'`
    if (!rows.length) {
      return NextResponse.json({
        bio: 'DevOps Engineer · Full Stack Developer · Explorer',
        name: 'Abhishek Singh',
        tagline: 'Capturing moments, building memories ✨',
        mainProfileUrl: '',
        journeyProfileUrl: '',
      })
    }
    return NextResponse.json(rows[0].data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable()
    const profile = await req.json()
    await sql`
      INSERT INTO journey_profile (key, data) VALUES ('main', ${JSON.stringify(profile)})
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
