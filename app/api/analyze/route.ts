// ─── POST /api/analyze ───────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import {
  parseGitHubUrl,
  buildGitHubAnalytics,
  fetchReadme,
  fetchFileTree,
  fetchFileContent,
} from '@/lib/github'
import {
  detectArchitecture,
  buildFileTree,
  parsePrismaSchema,
  buildAllDiagrams,
} from '@/lib/analyzer'
import { getCached, setCached } from '@/lib/cache'
import type { ProjectAnalysis } from '@/types/projects'

export const maxDuration = 60

// Build a fallback analysis when GitHub is unavailable
function buildFallbackAnalysis(owner: string, repo: string, repoUrl: string, projectSlug: string): ProjectAnalysis {
  const architecture = detectArchitecture([], {}, '')
  const diagrams = buildAllDiagrams(architecture, [], [], repo)
  return {
    id: `${owner}/${repo}`,
    projectSlug,
    repoUrl,
    readme: `# ${repo}\n\nGitHub data could not be fetched at this time. This may be due to API rate limits or the repository being private.\n\nPlease try refreshing in a few minutes.`,
    architecture,
    diagrams,
    githubAnalytics: {
      stars: 0, forks: 0, watchers: 0,
      contributorCount: 0, commitCount: 0,
      openIssues: 0, closedIssues: 0,
      languagePercentages: [],
      commitActivity: [],
      topContributors: [],
      recentCommits: [],
    },
    techStack: [],
    keyFeatures: [],
    fileTree: [],
    analyzedAt: new Date().toISOString(),
    cached: false,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { repoUrl, projectSlug, force } = body

    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl required' }, { status: 400 })
    }

    const cacheKey = `analysis:${repoUrl}`
    if (!force) {
      const cached = getCached(cacheKey)
      if (cached) {
        return NextResponse.json({ ...(cached as object), cached: true })
      }
    }

    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }

    const { owner, repo } = parsed
    const slug = projectSlug || repo

    // Parallel fetch everything — each call handles its own errors gracefully
    const [githubAnalytics, readme, rawTree] = await Promise.all([
      buildGitHubAnalytics(owner, repo).catch(() => ({
        stars: 0, forks: 0, watchers: 0,
        contributorCount: 0, commitCount: 0,
        openIssues: 0, closedIssues: 0,
        languagePercentages: [],
        commitActivity: [],
        topContributors: [],
        recentCommits: [],
      })),
      fetchReadme(owner, repo).catch(() => ''),
      fetchFileTree(owner, repo).catch(() => []),
    ])

    const filePaths: string[] = (rawTree as Array<{ type: string; path: string }>)
      .filter((f) => f.type === 'blob')
      .map((f) => f.path)
      .slice(0, 500)

    // Fetch key config files in parallel (failures are silently ignored)
    const configFiles = ['package.json', 'prisma/schema.prisma', 'schema.prisma']
    const configContents = await Promise.all(
      configFiles.map(f => fetchFileContent(owner, repo, f).catch(() => ''))
    )

    let packageJson: Record<string, unknown> = {}
    try {
      packageJson = JSON.parse(configContents[0]) || {}
    } catch { /* ignore */ }

    const prismaSchema = configContents[1] || configContents[2] || ''

    // Analyze
    const architecture = detectArchitecture(filePaths, packageJson, readme as string)
    const dbModels = prismaSchema ? parsePrismaSchema(prismaSchema) : []
    const diagrams = buildAllDiagrams(architecture, dbModels, filePaths, repo)
    const fileTree = buildFileTree(filePaths)

    const techStack: string[] = [
      architecture.frontend.framework,
      ...architecture.frontend.styling,
      architecture.backend.framework,
      architecture.database.name !== 'None' ? architecture.database.name : '',
      architecture.database.orm !== 'None' ? architecture.database.orm : '',
      ...architecture.patterns,
    ].filter(Boolean).filter(t => t !== 'Unknown' && t !== 'None')

    const analysis: ProjectAnalysis = {
      id: `${owner}/${repo}`,
      projectSlug: slug,
      repoUrl,
      readme: readme as string,
      architecture,
      diagrams,
      githubAnalytics: githubAnalytics as ProjectAnalysis['githubAnalytics'],
      techStack: [...new Set(techStack)],
      keyFeatures: extractKeyFeatures(readme as string),
      fileTree,
      analyzedAt: new Date().toISOString(),
      cached: false,
    }

    setCached(cacheKey, analysis)
    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[analyze]', err)
    // Return a fallback instead of a hard 500
    try {
      const body = await (req as any)._body || {}
      const repoUrl = body.repoUrl || ''
      const parsed = parseGitHubUrl(repoUrl)
      if (parsed) {
        const fallback = buildFallbackAnalysis(parsed.owner, parsed.repo, repoUrl, body.projectSlug || parsed.repo)
        return NextResponse.json(fallback)
      }
    } catch { /* ignore */ }
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

function extractKeyFeatures(readme: string): string[] {
  if (!readme) return []
  const features: string[] = []
  const lines = readme.split('\n')

  let inFeatureSection = false
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.match(/^#+\s*(feature|what|key|highlight|capability)/)) {
      inFeatureSection = true
      continue
    }
    if (inFeatureSection && lower.match(/^#+\s/)) {
      inFeatureSection = false
    }
    if (inFeatureSection && line.match(/^[-*]\s+.+/)) {
      features.push(line.replace(/^[-*]\s+/, '').trim())
    }
  }

  if (features.length === 0) {
    for (const line of lines) {
      if (line.match(/^[-*]\s+.{10,80}$/) && !line.toLowerCase().includes('install')) {
        features.push(line.replace(/^[-*]\s+/, '').trim())
      }
      if (features.length >= 6) break
    }
  }

  return features.slice(0, 8)
}
