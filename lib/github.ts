// ─── GitHub API Integration ───────────────────────────────────────────────────
import type { GitHubAnalytics, GitHubRepo } from '@/types/projects'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

const headers: HeadersInit = {
  Accept: 'application/vnd.github.v3+json',
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/)
    if (!match) return null
    return { owner: match[1], repo: match[2] }
  } catch {
    return null
  }
}

export async function fetchRepoData(owner: string, repo: string): Promise<GitHubRepo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      next: { revalidate: CACHE_TTL / 1000 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchReadme(owner: string, repo: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers, next: { revalidate: CACHE_TTL / 1000 } }
    )
    if (!res.ok) return ''
    const data = await res.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

export async function fetchLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      { headers, next: { revalidate: CACHE_TTL / 1000 } }
    )
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

export async function fetchContributors(owner: string, repo: string) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`,
      { headers, next: { revalidate: CACHE_TTL / 1000 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function fetchCommits(owner: string, repo: string) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`,
      { headers, next: { revalidate: CACHE_TTL / 1000 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function fetchCommitActivity(owner: string, repo: string): Promise<number[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`,
      { headers, next: { revalidate: CACHE_TTL / 1000 } }
    )
    if (!res.ok) return Array(52).fill(0)
    const data = await res.json()
    if (!Array.isArray(data)) return Array(52).fill(0)
    return data.slice(-12).map((w: { total: number }) => w.total)
  } catch {
    return Array(12).fill(0)
  }
}

export async function fetchContributorCount(owner: string, repo: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`,
      { headers }
    )
    if (!res.ok) return 0
    const link = res.headers.get('link')
    if (link) {
      const match = link.match(/page=(\d+)>; rel="last"/)
      if (match) return parseInt(match[1])
    }
    const data = await res.json()
    return Array.isArray(data) ? data.length : 0
  } catch {
    return 0
  }
}

export async function fetchFileTree(owner: string, repo: string, branch = 'main') {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers, next: { revalidate: CACHE_TTL / 1000 } }
    )
    if (!res.ok) {
      // try master
      const res2 = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`,
        { headers }
      )
      if (!res2.ok) return []
      const data2 = await res2.json()
      return data2.tree || []
    }
    const data = await res.json()
    return data.tree || []
  } catch {
    return []
  }
}

export async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers }
    )
    if (!res.ok) return ''
    const data = await res.json()
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return data.content || ''
  } catch {
    return ''
  }
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3776ab',
  Rust: '#dea584', Go: '#00add8', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', 'C#': '#178600', Ruby: '#701516', PHP: '#4f5d95',
  Swift: '#f05138', Kotlin: '#a97bff', Dart: '#00b4ab', Shell: '#89e051',
  HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c', Vue: '#41b883',
  Svelte: '#ff3e00', Dockerfile: '#384d54', YAML: '#cb171e',
}

export function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] || '#8b949e'
}

export async function buildGitHubAnalytics(owner: string, repo: string): Promise<GitHubAnalytics> {
  const [repoData, languages, contributors, commits, weeklyCommits, contributorCount] =
    await Promise.all([
      fetchRepoData(owner, repo),
      fetchLanguages(owner, repo),
      fetchContributors(owner, repo),
      fetchCommits(owner, repo),
      fetchCommitActivity(owner, repo),
      fetchContributorCount(owner, repo),
    ])

  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0)
  const languagePercentages = Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      percent: Math.round((bytes / totalBytes) * 100),
      color: getLanguageColor(name),
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 8)

  const recentCommits = Array.isArray(commits)
    ? commits.slice(0, 5).map((c: {
        sha: string
        commit: { message: string; author: { name: string; date: string } }
      }) => ({
        sha: c.sha?.slice(0, 7) || '',
        message: c.commit?.message?.split('\n')[0] || '',
        author: c.commit?.author?.name || '',
        date: c.commit?.author?.date || '',
      }))
    : []

  return {
    stars: repoData?.stargazers_count || 0,
    forks: repoData?.forks_count || 0,
    watchers: repoData?.watchers_count || 0,
    openIssues: repoData?.open_issues_count || 0,
    commitCount: weeklyCommits.reduce((a, b) => a + b, 0),
    contributorCount: contributorCount || (Array.isArray(contributors) ? contributors.length : 0),
    languages,
    languagePercentages,
    lastCommit: repoData?.pushed_at || '',
    weeklyCommits,
    recentCommits,
    contributors: Array.isArray(contributors)
      ? contributors.slice(0, 6).map((c: {
          login: string; avatar_url: string; contributions: number; html_url: string
        }) => ({
          login: c.login,
          avatar_url: c.avatar_url,
          contributions: c.contributions,
          html_url: c.html_url,
        }))
      : [],
    releases: 0,
    branch: repoData?.default_branch || 'main',
  }
}
