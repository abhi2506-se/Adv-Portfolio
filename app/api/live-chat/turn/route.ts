import { NextResponse } from 'next/server'

/**
 * Returns ICE server config for WebRTC calls.
 *
 * Setup (free tier, ~50GB/month, plenty for a portfolio site):
 *   1. Create a free account at https://www.metered.ca/tools/openrelay/ or
 *      https://dashboard.metered.ca (Metered TURN Server product).
 *   2. Create an "App" — you'll get an app name (subdomain) + API key.
 *   3. Set env vars:
 *        METERED_APP_NAME=your-app-name
 *        METERED_API_KEY=your-api-key
 *
 * Without these set, we fall back to public STUN-only servers. STUN alone
 * works for most direct calls but FAILS behind symmetric NAT / strict
 * corporate firewalls — TURN is what makes calls reliable for everyone,
 * so setting the two env vars above is strongly recommended before launch.
 */
export async function GET() {
  const appName = process.env.METERED_APP_NAME
  const apiKey = process.env.METERED_API_KEY

  const fallback = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    turnConfigured: false,
  }

  if (!appName || !apiKey) {
    return NextResponse.json(fallback)
  }

  try {
    const res = await fetch(`https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`, {
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json(fallback)
    const iceServers = await res.json()
    return NextResponse.json({ iceServers, turnConfigured: true })
  } catch (e) {
    console.error('[turn] fetch failed:', e)
    return NextResponse.json(fallback)
  }
}
