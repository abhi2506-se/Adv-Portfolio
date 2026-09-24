/**
 * GET /api/live-chat/gif-search?q=hello
 *
 * Thin server-side proxy to Giphy so the chat's GIF picker doesn't need to
 * ship an API key to the browser. Set GIPHY_API_KEY in the environment for
 * production use; falls back to Giphy's public testing key otherwise (fine
 * for light/demo traffic, but you should get your own free key at
 * https://developers.giphy.com for anything more than that).
 */
import { NextRequest, NextResponse } from 'next/server'

const FALLBACK_DEMO_KEY = 'dc6zaTOxFJmzC'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  const apiKey = process.env.GIPHY_API_KEY || FALLBACK_DEMO_KEY
  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=pg-13`

  try {
    const res = await fetch(endpoint)
    if (!res.ok) return NextResponse.json({ gifs: [], error: 'GIF search unavailable right now' }, { status: 200 })
    const data = await res.json()
    const gifs = (data.data || []).map((g: any) => ({
      id: g.id,
      url: g.images?.fixed_height?.url || g.images?.original?.url,
      previewUrl: g.images?.fixed_height_small?.url || g.images?.fixed_height_downsampled?.url || g.images?.fixed_height?.url,
      width: Number(g.images?.fixed_height?.width) || undefined,
      height: Number(g.images?.fixed_height?.height) || undefined,
    })).filter((g: any) => g.url)
    return NextResponse.json({ gifs })
  } catch (e) {
    return NextResponse.json({ gifs: [], error: 'GIF search unavailable right now' }, { status: 200 })
  }
}
