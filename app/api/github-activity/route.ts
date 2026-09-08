import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS github_settings (
      key TEXT PRIMARY KEY DEFAULT 'main',
      github_username TEXT NOT NULL DEFAULT 'abhi2506-se',
      github_token TEXT NOT NULL DEFAULT '',
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `
  // Insert default row if not exists
  await sql`
    INSERT INTO github_settings (key, github_username, github_token)
    VALUES ('main', 'abhi2506-se', '')
    ON CONFLICT (key) DO NOTHING
  `
}

function buildContributionWeeks(events: any[]) {
  // Build a 26-week heatmap from push events
  const counts: Record<string, number> = {}
  for (const e of events) {
    if (e.type === 'PushEvent' && e.created_at) {
      const day = e.created_at.slice(0, 10)
      counts[day] = (counts[day] || 0) + (e.payload?.commits?.length || 1)
    }
  }

  const weeks: { week: string; days: { date: string; count: number; level: number }[] }[] = []
  const now = new Date()
  // Go back 26 weeks
  const start = new Date(now)
  start.setDate(start.getDate() - 26 * 7)
  // Align to Sunday
  start.setDate(start.getDate() - start.getDay())

  let cur = new Date(start)
  while (cur <= now) {
    const weekDays = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().slice(0, 10)
      const count   = counts[dateStr] || 0
      const level   = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4
      weekDays.push({ date: dateStr, count, level })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push({ week: weekDays[0].date, days: weekDays })
  }
  return weeks
}

export async function GET() {
  try {
    await ensureTable()
    const rows = await sql`SELECT github_username, github_token FROM github_settings WHERE key = 'main'`
    const { github_username, github_token } = rows[0] || { github_username: 'abhi2506-se', github_token: '' }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Portfolio-App',
    }
    if (github_token) {
      headers['Authorization'] = `Bearer ${github_token}`
    }

    // Fetch user profile + events + repos in parallel
    const [userRes, eventsRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${github_username}`, { headers }),
      fetch(`https://api.github.com/users/${github_username}/events/public?per_page=30`, { headers }),
      fetch(`https://api.github.com/users/${github_username}/repos?sort=pushed&per_page=6&type=owner`, { headers }),
    ])

    if (!userRes.ok) {
      return NextResponse.json({ error: 'GitHub user not found or API limit reached', username: github_username }, { status: 404 })
    }

    const [user, events, repos] = await Promise.all([
      userRes.json(),
      eventsRes.ok ? eventsRes.json() : [],
      reposRes.ok ? reposRes.json() : [],
    ])

    // Process events into activity feed
    const activityFeed = (events as any[])
      .filter((e: any) => ['PushEvent', 'CreateEvent', 'PullRequestEvent', 'IssuesEvent', 'WatchEvent', 'ForkEvent', 'ReleaseEvent'].includes(e.type))
      .slice(0, 10)
      .map((e: any) => {
        let description = ''
        let icon = 'commit'
        switch (e.type) {
          case 'PushEvent':
            description = `Pushed ${e.payload?.commits?.length || 1} commit(s) to ${e.repo?.name?.split('/')[1] || e.repo?.name}`
            icon = 'push'
            break
          case 'CreateEvent':
            description = `Created ${e.payload?.ref_type} ${e.payload?.ref || ''} in ${e.repo?.name?.split('/')[1] || e.repo?.name}`
            icon = 'create'
            break
          case 'PullRequestEvent':
            description = `${e.payload?.action} PR in ${e.repo?.name?.split('/')[1] || e.repo?.name}`
            icon = 'pr'
            break
          case 'IssuesEvent':
            description = `${e.payload?.action} issue in ${e.repo?.name?.split('/')[1] || e.repo?.name}`
            icon = 'issue'
            break
          case 'WatchEvent':
            description = `Starred ${e.repo?.name?.split('/')[1] || e.repo?.name}`
            icon = 'star'
            break
          case 'ForkEvent':
            description = `Forked ${e.repo?.name?.split('/')[1] || e.repo?.name}`
            icon = 'fork'
            break
          case 'ReleaseEvent':
            description = `Released ${e.payload?.release?.tag_name} in ${e.repo?.name?.split('/')[1] || e.repo?.name}`
            icon = 'release'
            break
        }
        return {
          id: e.id,
          type: e.type,
          icon,
          description,
          repo: e.repo?.name,
          repoUrl: `https://github.com/${e.repo?.name}`,
          createdAt: e.created_at,
        }
      })

    // Process repos
    const topRepos = (repos as any[])
      .filter((r: any) => !r.fork)
      .slice(0, 6)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        url: r.html_url,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        updatedAt: r.pushed_at,
        watchers: r.watchers_count || 0,
      }))

    // Build language stats from repos
    const langMap: Record<string, number> = {}
    for (const r of repos as any[]) {
      if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1
    }
    const langColors: Record<string, string> = {
      TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
      Java: '#b07219', 'C++': '#f34b7d', Go: '#00ADD8',
      Rust: '#dea584', HTML: '#e34c26', CSS: '#563d7c',
    }
    const langStats = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, fill: langColors[name] || '#6b7280' }))

    // Simulated contribution weeks (last 26 weeks) from push events
    // In real scenario you'd use GitHub GraphQL with a token
    const contributionWeeks = buildContributionWeeks(events as any[])

    return NextResponse.json({
      username: github_username,
      profile: {
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
        profileUrl: user.html_url,
      },
      activityFeed,
      topRepos,
      langStats,
      contributionWeeks,
      fetchedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[github-activity] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable()
    const { github_username, github_token } = await req.json()
    await sql`
      UPDATE github_settings
      SET github_username = ${github_username || 'abhi2506-se'},
          github_token = ${github_token || ''},
          updated_at = ${Date.now()}
      WHERE key = 'main'
    `
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[github-settings] save error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
