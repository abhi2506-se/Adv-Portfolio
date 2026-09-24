// ─── POST /api/project-chat ───────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import type { ProjectAnalysis } from '@/types/projects'

export async function POST(req: NextRequest) {
  try {
    const { message, analysis, history = [] } = await req.json() as {
      message: string
      analysis: ProjectAnalysis
      history: { role: string; content: string }[]
    }

    if (!message || !analysis) {
      return NextResponse.json({ error: 'message and analysis required' }, { status: 400 })
    }

    const groqKey = process.env.GROQ_API_KEY?.trim()
    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key is not configured. Please add GROQ_API_KEY to your environment variables.' }, { status: 500 })
    }

    const { architecture: arch, githubAnalytics: gh, techStack, keyFeatures, readme } = analysis

    const systemPrompt = `You are an expert software architect and code analyst. You ONLY answer questions about the specific project described below. Do not discuss other projects or general topics unrelated to this project.

PROJECT: ${analysis.repoUrl}
TECH STACK: ${techStack.join(', ')}
KEY FEATURES: ${keyFeatures.join(', ')}

ARCHITECTURE:
- Frontend: ${arch.frontend.framework} with ${arch.frontend.styling.join(', ')}
- State Management: ${arch.frontend.stateManagement}
- Backend: ${arch.backend.framework} (${arch.backend.language})
- Database: ${arch.database.name} via ${arch.database.orm}
- Auth: ${arch.authentication.strategy.join(', ')} using ${arch.authentication.providers.join(', ') || 'custom'}
- API Style: ${arch.apis.style}
- Hosting: ${arch.devops.hosting}
- Containerization: ${arch.devops.containerization}
- CI/CD: ${arch.devops.cicd.join(', ') || 'None'}
- Patterns: ${arch.patterns.join(', ')}

GITHUB STATS:
- Stars: ${gh.stars}, Forks: ${gh.forks}, Contributors: ${gh.contributorCount}
- Primary Language: ${gh.languagePercentages[0]?.name || 'Unknown'}
- Languages: ${gh.languagePercentages.map(l => `${l.name} ${l.percent}%`).join(', ')}

README SUMMARY (first 2000 chars):
${readme.slice(0, 2000)}

Answer questions concisely and technically. Use markdown formatting. When discussing code, use code blocks. Keep answers focused ONLY on this specific project.`

    const messages = [
      ...history.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[project-chat] Groq error:', err)
      return NextResponse.json({ error: `AI error: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || 'No response from AI.'
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[project-chat]', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
