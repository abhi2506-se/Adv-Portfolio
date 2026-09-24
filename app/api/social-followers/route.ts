/**
 * /api/social-followers
 * Live follower counts. Instagram uses multiple strategies.
 * Clears cache on every call if ?refresh=1
 */
import { NextRequest, NextResponse } from 'next/server'
import { dbGetSettings } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getConfig() {
  try {
    const settings = (await dbGetSettings()) as Record<string, string>
    return {
      githubUsername:       settings.GITHUB_USERNAME               || process.env.GITHUB_USERNAME               || 'abhi2506-se',
      githubToken:          settings.GITHUB_TOKEN                  || process.env.GITHUB_TOKEN                  || '',
      instagramUsername:    settings.INSTAGRAM_USERNAME            || process.env.INSTAGRAM_USERNAME            || '_abhiiisheksingh',
      instagramFallback:    parseInt(settings.INSTAGRAM_FOLLOWERS_FALLBACK || process.env.INSTAGRAM_FOLLOWERS_FALLBACK || '0'),
      linkedinFollowers:    parseInt(settings.LINKEDIN_FOLLOWERS   || process.env.LINKEDIN_FOLLOWERS            || '500'),
      twitterFollowers:     parseInt(settings.TWITTER_FOLLOWERS    || process.env.TWITTER_FOLLOWERS             || '200'),
    }
  } catch {
    return {
      githubUsername: process.env.GITHUB_USERNAME || 'abhi2506-se',
      githubToken:    process.env.GITHUB_TOKEN    || '',
      instagramUsername: process.env.INSTAGRAM_USERNAME || '_abhiiisheksingh',
      instagramFallback: parseInt(process.env.INSTAGRAM_FOLLOWERS_FALLBACK || '0'),
      linkedinFollowers: parseInt(process.env.LINKEDIN_FOLLOWERS || '500'),
      twitterFollowers:  parseInt(process.env.TWITTER_FOLLOWERS  || '200'),
    }
  }
}

async function fetchGitHubFollowers(username: string, token: string): Promise<number> {
  if (!username) return 0
  try {
    const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Portfolio-App' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    // Primary: REST API
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers, signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const data = await res.json()
      if (typeof data.followers === 'number') return data.followers
    }

    // Fallback: GraphQL (no token needed for public data)
    const gql = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `{ user(login: "${username}") { followers { totalCount } } }` }),
      signal: AbortSignal.timeout(8000),
    })
    if (gql.ok) {
      const gdata = await gql.json()
      const count = gdata?.data?.user?.followers?.totalCount
      if (typeof count === 'number') return count
    }

    return 0
  } catch { return 0 }
}

/**
 * Instagram Strategy 1: unofficial web_profile_info endpoint
 */
async function igStrategy1(username: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          'User-Agent':        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'X-IG-App-ID':       '936619743392459',
          'X-Requested-With':  'XMLHttpRequest',
          'Accept':            'application/json',
          'Accept-Language':   'en-US,en;q=0.9',
          'Referer':           `https://www.instagram.com/${username}/`,
          'Sec-Fetch-Dest':    'empty',
          'Sec-Fetch-Mode':    'cors',
          'Sec-Fetch-Site':    'same-origin',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const count = data?.data?.user?.edge_followed_by?.count
    return typeof count === 'number' ? count : null
  } catch { return null }
}

/**
 * Instagram Strategy 2: /?__a=1&__d=dis scrape
 */
async function igStrategy2(username: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript',
        'X-IG-App-ID': '936619743392459',
        'Referer': 'https://www.instagram.com/',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const text = await res.text()
    // Try parsing as JSON
    try {
      const json = JSON.parse(text)
      const count = json?.graphql?.user?.edge_followed_by?.count
             ?? json?.data?.user?.edge_followed_by?.count
      if (typeof count === 'number') return count
    } catch {}
    // Regex fallback on raw text
    const m = text.match(/"edge_followed_by":\{"count":(\d+)\}/)
    return m ? parseInt(m[1]) : null
  } catch { return null }
}

/**
 * Instagram Strategy 3: HTML scrape of public profile
 */
async function igStrategy3(username: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const html = await res.text()
    // Multiple regex patterns for different page structures
    const patterns = [
      /"edge_followed_by":\{"count":(\d+)\}/,
      /"follower_count":(\d+)/,
      /,"followers":(\d+),/,
      /(\d[\d,]+)\s+[Ff]ollowers/,
      /"followers_count":(\d+)/,
    ]
    for (const p of patterns) {
      const m = html.match(p)
      if (m) return parseInt(m[1].replace(/,/g, ''))
    }
    return null
  } catch { return null }
}

/**
 * Instagram Strategy 4: Third-party open source API proxy
 */
async function igStrategy4(username: string): Promise<number | null> {
  try {
    // Use a public proxy that reads Instagram
    const res = await fetch(`https://www.instagram.com/web/search/topsearch/?query=${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // Search results contain follower counts for exact username match
    const users = data?.users || []
    const match = users.find((u: any) => u?.user?.username?.toLowerCase() === username.toLowerCase())
    if (match?.user?.follower_count) return match.user.follower_count
    return null
  } catch { return null }
}

async function fetchInstagramFollowers(username: string, fallback: number): Promise<number> {
  // Try all strategies in parallel, use first success
  const [s1, s2, s3, s4] = await Promise.allSettled([
    igStrategy1(username),
    igStrategy2(username),
    igStrategy3(username),
    igStrategy4(username),
  ])

  for (const result of [s1, s2, s3, s4]) {
    if (result.status === 'fulfilled' && result.value !== null && result.value > 0) {
      console.log(`[social-followers] Instagram @${username}: ${result.value}`)
      return result.value
    }
  }

  console.log(`[social-followers] Instagram @${username}: all strategies failed, using fallback ${fallback}`)
  return fallback
}

interface SocialFollowers {
  github: number; instagram: number; linkedin: number; twitter: number
  instagramUsername: string; fetchedAt: number; instagramLive: boolean
}

let cache: { data: SocialFollowers; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get('refresh') === '1'
  if (refresh) cache = null // force refresh

  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
      })
    }

    const cfg = await getConfig()
    const [github, instagramRaw] = await Promise.all([
      fetchGitHubFollowers(cfg.githubUsername, cfg.githubToken),
      fetchInstagramFollowers(cfg.instagramUsername, cfg.instagramFallback),
    ])

    const instagramLive = instagramRaw > 0 && instagramRaw !== cfg.instagramFallback
    const instagram     = instagramRaw > 0 ? instagramRaw : cfg.instagramFallback

    const data: SocialFollowers = {
      github, instagram, instagramLive,
      linkedin: cfg.linkedinFollowers,
      twitter:  cfg.twitterFollowers,
      instagramUsername: cfg.instagramUsername,
      fetchedAt: Date.now(),
    }
    cache = { data, ts: Date.now() }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (e) {
    console.error('[social-followers] fatal:', e)
    return NextResponse.json(
      { github: 0, instagram: 0, linkedin: 0, twitter: 0, instagramUsername: '', instagramLive: false, fetchedAt: Date.now() },
      { status: 500 }
    )
  }
}
