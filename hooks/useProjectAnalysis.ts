'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectAnalysis, GitHubAnalytics } from '@/types/projects'

// ── Fetch project analysis ────────────────────────────────────────────────────

async function analyzeProject(repoUrl: string, projectSlug: string): Promise<ProjectAnalysis> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, projectSlug }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }))
    throw new Error(err.error || 'Analysis failed')
  }
  return res.json()
}

async function fetchGitHubAnalytics(repoUrl: string): Promise<GitHubAnalytics> {
  const res = await fetch(`/api/github?url=${encodeURIComponent(repoUrl)}`)
  if (!res.ok) throw new Error('Failed to fetch GitHub data')
  return res.json()
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useProjectAnalysis(repoUrl: string | undefined, slug: string) {
  return useQuery({
    queryKey: ['project-analysis', repoUrl],
    queryFn: () => analyzeProject(repoUrl!, slug),
    enabled: !!repoUrl && repoUrl.includes('github.com'),
    staleTime: 1000 * 60 * 30, // 30 min
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export function useGitHubAnalytics(repoUrl: string | undefined) {
  return useQuery({
    queryKey: ['github-analytics', repoUrl],
    queryFn: () => fetchGitHubAnalytics(repoUrl!),
    enabled: !!repoUrl && repoUrl.includes('github.com'),
    staleTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export function useReanalyze(repoUrl: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, projectSlug: slug, force: true }),
      })
      if (!res.ok) throw new Error('Re-analysis failed')
      return res.json() as Promise<ProjectAnalysis>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['project-analysis', repoUrl], data)
    },
  })
}
