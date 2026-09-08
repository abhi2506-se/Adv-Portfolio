/**
 * POST /api/journey/caption
 *
 * Generates a smart social-media style caption for an Abhigram post.
 * Body: { title, description, tags, location, experience }
 * Returns: { caption: string }
 *
 * Zero extra dependencies — uses the same raw fetch + Groq-free-tier pattern
 * as /api/ai/route.ts. No @anthropic-ai/sdk import needed.
 *
 * Priority:
 *   1. Anthropic (claude-3-haiku)  — if ANTHROPIC_API_KEY is set
 *   2. Groq (llama-3.3-70b)        — if GROQ_API_KEY is set  [FREE tier]
 *   3. Smart template fallback      — always works, zero cost, zero API keys
 */
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a social media content creator for a developer's personal journey feed called "Abhigram".
Generate a single engaging, authentic social-media caption. Keep it personal, relatable and professional — like a real developer sharing their journey.
Rules:
- 2-4 sentences, conversational tone
- Mix tech/professional with human/personal elements
- End with 3-5 relevant hashtags
- NO generic phrases like "excited to share" or "thrilled to announce"
- Sound like a real person, not a press release
- Match the vibe: developer journey, coding life, achievements, travel, or learning moments
Return ONLY the caption text. No quotes, no preamble.`

// ─── Anthropic call (raw fetch, no SDK) ───────────────────────────────────────
async function callAnthropic(apiKey: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-3-haiku-20240307',
      max_tokens: 300,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  })
  const data = await res.json()
  const text = data?.content?.[0]?.text?.trim()
  if (!text) throw new Error(`Anthropic empty response: ${res.status}`)
  return text
}

// ─── Groq call — FREE tier, no credit card required ──────────────────────────
async function callGroq(apiKey: string, userPrompt: string): Promise<string> {
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
  for (const model of models) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content?.trim()
      if (text) return text
    }
  }
  throw new Error('Groq: all models failed')
}

// ─── Smart template fallback — 100% free, no API key needed ──────────────────
// Generates varied, professional captions purely from the post metadata.
function templateCaption(title: string, description: string, tags: string[], location: string, experience: string): string {
  const t     = title?.trim()       || ''
  const desc  = description?.trim() || ''
  const exp   = experience?.trim()  || ''
  const loc   = location?.trim()    || ''
  const htags = (tags ?? []).slice(0, 5).map(tag => `#${tag.replace(/^#/, '')}`).join(' ')

  const openers = [
    `Every line of code tells a story.`,
    `Growth looks different every day — and that's exactly the point.`,
    `Some days you build. Some days you learn. Both count.`,
    `This is what the journey looks like from the inside.`,
    `Not every milestone comes with applause — some you just have to feel yourself.`,
    `Real progress is quiet, consistent, and worth celebrating.`,
  ]
  const opener = openers[Math.floor(Math.random() * openers.length)]

  const parts: string[] = [opener]

  if (t)    parts.push(`${t}${desc ? ' — ' + desc.slice(0, 80) + (desc.length > 80 ? '…' : '') : ''}`)
  else if (desc) parts.push(desc.slice(0, 120) + (desc.length > 120 ? '…' : ''))

  if (exp)  parts.push(exp.slice(0, 100) + (exp.length > 100 ? '…' : ''))
  if (loc)  parts.push(`📍 ${loc}`)

  const tagLine = htags || '#DevLife #CodingJourney #BuildInPublic #TechJourney'
  parts.push(tagLine)

  return parts.join('\n')
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { title = '', description = '', tags = [], location = '', experience = '' } = await req.json()

    const userPrompt = [
      title       && `Title: ${title}`,
      description && `Description: ${description}`,
      location    && `Location: ${location}`,
      experience  && `Experience: ${experience}`,
      tags?.length && `Tags: ${(tags as string[]).join(', ')}`,
    ].filter(Boolean).join('\n')

    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim()
    const groqKey      = process.env.GROQ_API_KEY?.trim()

    // 1 — Try Anthropic
    if (anthropicKey) {
      try {
        const caption = await callAnthropic(anthropicKey, userPrompt)
        return NextResponse.json({ caption })
      } catch (e) {
        console.warn('[caption] Anthropic failed, trying Groq:', e)
      }
    }

    // 2 — Try Groq (free tier)
    if (groqKey) {
      try {
        const caption = await callGroq(groqKey, userPrompt)
        return NextResponse.json({ caption })
      } catch (e) {
        console.warn('[caption] Groq failed, using template:', e)
      }
    }

    // 3 — Template fallback (zero cost, always works)
    const caption = templateCaption(title, description, tags, location, experience)
    return NextResponse.json({ caption })

  } catch (e) {
    console.error('[caption] route error:', e)
    // Even on total failure return a usable caption
    return NextResponse.json({
      caption: 'Every step forward is progress worth sharing. 🚀\n#DevLife #CodingJourney #BuildInPublic',
    })
  }
}
