// ─── GET /api/github?owner=...&repo=... ───────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { buildGitHubAnalytics, parseGitHubUrl } from '@/lib/github'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const repoUrl = url.searchParams.get('url')
  const owner = url.searchParams.get('owner')
  const repo = url.searchParams.get('repo')

  let o = owner, r = repo

  if (repoUrl) {
    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    o = parsed.owner; r = parsed.repo
  }

  if (!o || !r) {
    return NextResponse.json({ error: 'owner and repo required' }, { status: 400 })
  }

  try {
    const analytics = await buildGitHubAnalytics(o, r)
    return NextResponse.json(analytics, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch GitHub data' }, { status: 500 })
  }
}
