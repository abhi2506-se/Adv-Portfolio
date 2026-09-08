import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { dbUpsertChatbotSession, dbGetAbuseRecord, dbRecordAbuse, dbMarkWarnShown, dbClearAbuseRecord } from '@/lib/db'
import { isWhitelistedName } from '@/lib/security-whitelist'
import { sendPushToAdmin } from '@/lib/notifications'

const sql = neon(process.env.DATABASE_URL!)

async function getPortfolioContext() {
  try {
    const sql2 = neon(process.env.DATABASE_URL!)
    const rows = await sql2`SELECT data FROM portfolio_settings LIMIT 1`
    if (rows[0]?.data) {
      return typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data
    }
    return null
  } catch {
    return null
  }
}

// Returns blog and certificate counts for the system prompt context
async function getJourneyStats(): Promise<{ blogCount: number; certCount: number }> {
  try {
    const [blogs, certs] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM journey_blogs`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM journey_certificates`.catch(() => [{ count: 0 }]),
    ])
    return {
      blogCount: Number(blogs[0]?.count ?? 0),
      certCount: Number(certs[0]?.count ?? 0),
    }
  } catch {
    return { blogCount: 0, certCount: 0 }
  }
}

// Fire-and-forget analytics — never throws, never blocks the response
async function trackAnalytics(message: string, intent: string) {
  try {
    await sql`INSERT INTO ai_analytics (message, intent) VALUES (${message}, ${intent})`
  } catch {
    // Analytics failures are silent — never affect the user
  }
}

async function getChatbotSettings(): Promise<{ personalDetails: string }> {
  try {
    const rows = await sql`SELECT key, value FROM chatbot_settings WHERE key = 'chatbot_personal_details'`
    const personalDetails = rows[0]?.value?.trim() ?? ''
    return { personalDetails }
  } catch {
    return { personalDetails: '' }
  }
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function tryParseJson(text: string) {
  try { return JSON.parse(text) } catch { return {} }
}

function trimPortfolio(data: any) {
  if (!data) return 'Not configured'
  const safeData = {
    name: data.name,
    title: data.title,
    about: data.about,
    education: data.education,
    experience: data.experience,
    skills: data.skills,
    projects: data.projects?.map((p: any) => ({
      title: p.title || p.name,
      description: p.description || p.longDescription || '',
      tech: p.tech || p.tags || [],
      github: p.github || p.repoUrl || '',
      live: p.live || p.liveUrl || '',
      image: p.image || '',
      featured: p.featured || false,
      features: p.features || [],
      caseStudy: p.caseStudy || null,
    })) || [],
  }
  return JSON.stringify(safeData)
}

type ChatMsg = { role: 'user' | 'assistant'; content: string }

function buildSystemPrompt(portfolioSnippet: string, blogCount: number, certCount: number, personalDetails?: string) {
  const extraDetails = personalDetails?.trim()
    ? `\n\nExtra Personal Details (share when relevant or asked):\n${personalDetails.trim()}`
    : ''
  return `You are a professional HR assistant representing Abhishek Singh.

Your role is to:
- Explain Abhishek's skills, projects, and experience confidently
- Present him as a strong candidate
- Answer like a recruiter speaking to a client or hiring manager

Guidelines:
1. Always be confident and positive
2. Highlight strengths, skills, and project impact
3. If exact data is missing, infer reasonably based on skills/projects
4. NEVER say "I don't have information"
5. Keep answers clear, professional, and concise (3-5 sentences)
6. Speak as if recommending a candidate

Personal Info (only share if the user explicitly asks - do NOT volunteer):
- Date of birth: 25th June
- Marital status: Married
- Wife's name: Gayatri Singh

Portfolio Data:
${portfolioSnippet}

Additional Info:
- ${blogCount} blog posts
- ${certCount} certificates${extraDetails}

Tone:
Professional, confident, recruiter-style, helpful.`
}

// Try a small set of models in order, in case one is deprecated/unavailable
// on the caller's account. This is the main fix for the persistent
// "Something went wrong (500)" error: the previously hard-coded model
// (claude-3-haiku-20240307) can be retired/unavailable for some accounts,
// which made *every* chat message fail. We now fall back automatically.
const ANTHROPIC_MODELS = [
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
  'claude-3-5-sonnet-20241022',
]

async function callAnthropic(apiKey: string, systemPrompt: string, messages: ChatMsg[]): Promise<string> {
  let lastErr: ApiError | null = null

  for (const model of ANTHROPIC_MODELS) {
    let res: Response
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 400,
          system: systemPrompt,
          messages,
        }),
      })
    } catch (networkErr) {
      // Network-level failure (DNS, timeout, fetch blocked, etc.)
      console.error(`[AI] Anthropic network error (${model}):`, networkErr)
      lastErr = new ApiError('Network error reaching Anthropic', 502)
      continue
    }

    const raw = await res.text()
    const data = tryParseJson(raw) as { content?: { text?: string }[]; error?: { message?: string; type?: string } }

    if (!res.ok) {
      console.error(`[AI] Anthropic ${res.status} (${model}) - ${data?.error?.message ?? raw.slice(0, 200)}`)
      lastErr = new ApiError(data?.error?.message || `Anthropic error ${res.status}`, res.status)
      // If the model itself is the problem (not found / retired / overloaded),
      // try the next model in the list instead of failing immediately.
      if (res.status === 404 || res.status === 400 || res.status === 429 || res.status >= 500) continue
      throw lastErr
    }

    const reply = data?.content?.[0]?.text?.trim()
    if (reply) return reply

    console.error(`[AI] Anthropic empty reply (${model}):`, raw.slice(0, 200))
    lastErr = new ApiError('Empty response from Anthropic', res.status || 500)
  }

  throw lastErr || new ApiError('All Anthropic models failed', 500)
}

async function callGroq(apiKey: string, systemPrompt: string, messages: ChatMsg[]): Promise<string> {
  // llama-3.3-70b-versatile and llama-3.1-8b-instant were fully decommissioned
  // by Groq on 2026-08-16 — any request using them now fails every time,
  // regardless of API key validity. Using Groq's official replacements.
  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']
  for (const model of models) {
    let res: Response
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-6)],
          max_tokens: 400,
        }),
      })
    } catch (networkErr) {
      console.error(`[AI] Groq network error (${model}):`, networkErr)
      continue
    }
    const raw = await res.text()
    if (res.ok) {
      const data = tryParseJson(raw) as { choices?: { message?: { content?: string } }[] }
      const reply = data?.choices?.[0]?.message?.content?.trim()
      if (reply) return reply
    } else {
      const parsed = tryParseJson(raw) as { error?: { message?: string } }
      console.error(`[AI] Groq ${res.status} (${model}) - ${parsed?.error?.message ?? 'HTTP error'}`)
    }
  }
  throw new ApiError('All Groq models failed.', 500)
}

// ── Google Gemini ────────────────────────────────────────────────────────────
// Uses the Generative Language API directly (no SDK needed). gemini-2.5-pro
// is being shut down 2026-10-16, so we deliberately avoid it — Flash and
// Flash-Lite are the current stable, non-deprecated tier as of this writing.
async function callGemini(apiKey: string, systemPrompt: string, messages: ChatMsg[]): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  for (const model of models) {
    let res: Response
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { maxOutputTokens: 400 },
          }),
        }
      )
    } catch (networkErr) {
      console.error(`[AI] Gemini network error (${model}):`, networkErr)
      continue
    }
    const raw = await res.text()
    if (res.ok) {
      const data = tryParseJson(raw) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim()
      if (reply) return reply
    } else {
      const parsed = tryParseJson(raw) as { error?: { message?: string } }
      console.error(`[AI] Gemini ${res.status} (${model}) - ${parsed?.error?.message ?? 'HTTP error'}`)
    }
  }
  throw new ApiError('All Gemini models failed.', 500)
}

// ── OpenRouter ────────────────────────────────────────────────────────────────
// Single OpenAI-compatible endpoint that itself routes to many underlying
// providers/models, so a single model going down elsewhere doesn't kill this
// path the way it did with the hardcoded Groq model names above.
async function callOpenRouter(apiKey: string, systemPrompt: string, messages: ChatMsg[]): Promise<string> {
  const models = ['openai/gpt-oss-120b', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.5-flash']
  for (const model of models) {
    let res: Response
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Recommended by OpenRouter for attribution/rate-limit purposes —
          // harmless to omit but keeps things in good standing with them.
          'HTTP-Referer': 'https://abhishek-portfolio.vercel.app',
          'X-Title': 'Portfolio AI Assistant',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-6)],
          max_tokens: 400,
        }),
      })
    } catch (networkErr) {
      console.error(`[AI] OpenRouter network error (${model}):`, networkErr)
      continue
    }
    const raw = await res.text()
    if (res.ok) {
      const data = tryParseJson(raw) as { choices?: { message?: { content?: string } }[] }
      const reply = data?.choices?.[0]?.message?.content?.trim()
      if (reply) return reply
    } else {
      const parsed = tryParseJson(raw) as { error?: { message?: string } }
      console.error(`[AI] OpenRouter ${res.status} (${model}) - ${parsed?.error?.message ?? 'HTTP error'}`)
    }
  }
  throw new ApiError('All OpenRouter models failed.', 500)
}

// Fire-and-forget session conversation save — never blocks response
async function saveSession(
  sessionId: string | undefined,
  history: unknown[],
  userMessage: string,
  assistantReply: string,
  intent: string,
  meta?: {
    user_name?: string
    ip_address?: string
    browser_name?: string
    device_name?: string
    fingerprint?: string
    user_location?: string
    latitude?: number
    longitude?: number
  }
) {
  if (!sessionId) return
  try {
    const now = Date.now()
    const prior = (Array.isArray(history) ? history : []).map((m: any) => ({
      role: (m?.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(m?.content || '').trim(),
      timestamp: now,
    })).filter(m => m.content.length > 0)

    const newMessages = [
      ...prior,
      { role: 'user' as const, content: userMessage, timestamp: now },
      { role: 'assistant' as const, content: assistantReply, timestamp: now, intent },
    ]

    // Push admin on first message of a session (prior is empty = brand new chat)
    if (prior.length === 0) {
      const intentEmoji = intent === 'hire' ? '💼' : intent === 'project' ? '🚀' : '🤖'
      sendPushToAdmin({
        title: `${intentEmoji} New AI Chatbot Conversation`,
        body: `"${userMessage.slice(0, 90)}${userMessage.length > 90 ? '…' : ''}"`,
        tag: `ai-session-${sessionId}`,
        url: '/admin',
      }).catch(() => {})
    }
    await dbUpsertChatbotSession(sessionId, newMessages, intent, meta)
  } catch {
    // Never fail the main response for analytics
  }
}

function sanitizeHistory(raw: unknown): ChatMsg[] {
  const typed: ChatMsg[] = (Array.isArray(raw) ? raw.slice(-10) : [])
    .map((m: unknown) => {
      const msg = m as { role?: string; content?: string }
      return {
        role: (msg?.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: String(msg?.content || '').trim(),
      }
    })
    .filter(m => m.content.length > 0)

  while (typed.length > 0 && typed[0].role === 'assistant') typed.shift()

  const alternated: ChatMsg[] = []
  for (const m of typed) {
    if (alternated.length === 0) {
      alternated.push(m)
    } else if (m.role !== alternated[alternated.length - 1].role) {
      alternated.push(m)
    } else {
      alternated[alternated.length - 1] = m
    }
  }
  while (alternated.length > 0 && alternated[alternated.length - 1].role === 'user') {
    alternated.pop()
  }
  return alternated
}

// ── Abusive language patterns ────────────────────────────────────────────────
const ABUSE_PATTERNS = [
  /\b(fuck|shit|ass(?:hole)?|bitch|bastard|cunt|dick|cock|pussy|whore|slut|faggot|nigger|retard)\b/i,
  /\b(kill\s+you|hate\s+you|go\s+die|shut\s+up|stupid\s+bot|idiot\s+bot|dumb\s+bot|useless\s+bot)\b/i,
  /\b(motherfucker|son\s+of\s+a\s+bitch|piece\s+of\s+shit|go\s+to\s+hell)\b/i,
]

function isAbusive(text: string): boolean {
  return ABUSE_PATTERNS.some(p => p.test(text))
}

// ── Portfolio Knowledge Engine ────────────────────────────────────────────────
function buildPortfolioKnowledge(portfolio: any): string {
  if (!portfolio) return ''
  const lines: string[] = []

  if (portfolio.name)        lines.push(`Full Name: ${portfolio.name}`)
  if (portfolio.title)       lines.push(`Title/Role: ${portfolio.title}`)
  if (portfolio.about)       lines.push(`About: ${portfolio.about}`)

  if (portfolio.education?.length) {
    lines.push('\n=== EDUCATION ===')
    for (const e of portfolio.education) {
      lines.push(`- ${e.degree || ''} from ${e.institution || e.school || ''} (${e.year || e.graduation_year || ''})`)
      if (e.cgpa || e.gpa) lines.push(`  CGPA/GPA: ${e.cgpa || e.gpa}`)
      if (e.field || e.specialization) lines.push(`  Field: ${e.field || e.specialization}`)
    }
  }

  if (portfolio.experience?.length) {
    lines.push('\n=== EXPERIENCE ===')
    for (const e of portfolio.experience) {
      lines.push(`- ${e.role || e.title} at ${e.company} (${e.duration || e.period || e.from + ' - ' + e.to || ''})`)
      if (e.description) lines.push(`  ${e.description}`)
    }
  }

  if (portfolio.skills) {
    lines.push('\n=== SKILLS ===')
    if (Array.isArray(portfolio.skills)) {
      lines.push(portfolio.skills.map((s: any) => typeof s === 'string' ? s : s.name || s.skill).filter(Boolean).join(', '))
    } else if (typeof portfolio.skills === 'object') {
      for (const [cat, items] of Object.entries(portfolio.skills)) {
        const skillList = Array.isArray(items)
          ? items.map((i: any) => typeof i === 'string' ? i : i.name).join(', ')
          : String(items)
        lines.push(`${cat}: ${skillList}`)
      }
    }
  }

  if (portfolio.projects?.length) {
    lines.push('\n=== PROJECTS ===')
    for (const p of portfolio.projects) {
      lines.push(`- ${p.title || p.name}: ${p.description || p.summary || ''}`)
      if (p.tech || p.technologies) lines.push(`  Tech: ${Array.isArray(p.tech || p.technologies) ? (p.tech || p.technologies).join(', ') : p.tech || p.technologies}`)
    }
  }

  if (portfolio.certifications?.length) {
    lines.push('\n=== CERTIFICATIONS ===')
    for (const c of portfolio.certifications) {
      lines.push(`- ${c.name || c.title} (${c.issuer || c.organization || ''}, ${c.year || c.date || ''})`)
    }
  }

  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim()
  const groqKey = process.env.GROQ_API_KEY?.trim()
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim()

  if (!anthropicKey && !groqKey && !geminiKey && !openrouterKey) {
    return NextResponse.json({ reply: 'AI assistant not configured.' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const {
      message, history, session_id,
      user_name, browser_name, device_name, fingerprint,
      user_location, latitude, longitude,
    } = body as {
      message?: string; history?: unknown[]; session_id?: string
      user_name?: string; browser_name?: string; device_name?: string
      fingerprint?: string; user_location?: string; latitude?: number; longitude?: number
    }

    // Extract real client IP server-side
    const forwarded = (req as any).headers?.get?.('x-forwarded-for') || ''
    const realIp    = (req as any).headers?.get?.('x-real-ip') || ''
    const ip_address = (forwarded ? forwarded.split(',')[0].trim() : realIp) || 'unknown'

    const meta = { user_name, ip_address, browser_name, device_name, fingerprint, user_location, latitude, longitude }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // ── ABUSE DETECTION ────────────────────────────────────────────────────
    // Whitelisted visitors are fully exempt — skip detection entirely and
    // clear any pre-existing abuse/block record tied to their fingerprint/IP.
    const whitelisted = isWhitelistedName(user_name)
    if (whitelisted) {
      try { await dbClearAbuseRecord(fingerprint || '', ip_address || '') } catch {}
    }
    if (!whitelisted && isAbusive(message)) {
      try {
        const fp = fingerprint || ''
        const ip = ip_address || ''
        const record = await dbRecordAbuse(fp, ip)

        if (record.blocked) {
          return NextResponse.json({
            reply: '🚫 Your access to this chatbot has been restricted due to repeated violations of our communication policy. Please contact the site owner if you believe this is an error.',
            blocked: true,
          })
        }

        // First offense — show warning once
        const alreadyWarned = record.warn_shown
        if (!alreadyWarned) {
          await dbMarkWarnShown(fp, ip)
          return NextResponse.json({
            reply: '⚠️ Warning: Please maintain respectful communication. Continued abuse will result in access restriction.',
            abusive: true,
            warn: true,
          })
        }

        return NextResponse.json({
          reply: '⚠️ Abusive language detected. Please keep conversations respectful.',
          abusive: true,
        })
      } catch (abuseErr) {
        console.error('[AI] abuse tracking error:', abuseErr)
      }
    }

    // ── CHECK IF USER IS ALREADY BLOCKED ──────────────────────────────────
    if (!whitelisted) try {
      const fp = fingerprint || ''
      const ip = ip_address || ''
      if (fp || ip) {
        const abuseRecord = await dbGetAbuseRecord(fp, ip)
        if (abuseRecord?.blocked) {
          return NextResponse.json({
            reply: '🚫 Your access to this chatbot has been restricted. Please contact the site owner to appeal.',
            blocked: true,
          })
        }
      }
    } catch { /* non-blocking */ }

    // ── INTENT DETECTION + ANALYTICS ──────────────────────────────────────
    const lowerMsg = message.toLowerCase()
    let intent = 'general'
    if (lowerMsg.includes('hire')) intent = 'hire'
    else if (lowerMsg.includes('project')) intent = 'project'
    else if (lowerMsg.includes('contact')) intent = 'contact'
    else if (lowerMsg.includes('resume')) intent = 'resume'
    else if (lowerMsg.includes('education') || lowerMsg.includes('degree') || lowerMsg.includes('university') || lowerMsg.includes('graduation') || lowerMsg.includes('cgpa') || lowerMsg.includes('college')) intent = 'education'
    else if (lowerMsg.includes('skill') || lowerMsg.includes('technolog') || lowerMsg.includes('stack')) intent = 'skills'
    else if (lowerMsg.includes('experience') || lowerMsg.includes('work') || lowerMsg.includes('job')) intent = 'experience'
    trackAnalytics(message, intent)

    // ── PORTFOLIO KNOWLEDGE ENGINE ─────────────────────────────────────────
    const [portfolio, stats, chatbotSettings] = await Promise.all([
      getPortfolioContext(), getJourneyStats(), getChatbotSettings(),
    ])
    const portfolioSnippet = trimPortfolio(portfolio)
    const portfolioKnowledge = buildPortfolioKnowledge(portfolio)
    const systemPrompt = buildSystemPrompt(
      portfolioSnippet + (portfolioKnowledge ? '\n\n=== COMPLETE KNOWLEDGE BASE ===\n' + portfolioKnowledge : ''),
      stats.blogCount, stats.certCount, chatbotSettings.personalDetails
    )
    const sanitized = sanitizeHistory(history ?? [])
    const chatMessages: ChatMsg[] = [...sanitized, { role: 'user', content: message }]

    if (anthropicKey) {
      try {
        const reply = await callAnthropic(anthropicKey, systemPrompt, chatMessages)
        saveSession(session_id, history ?? [], message, reply, intent, meta)
        return NextResponse.json({ reply, intent })
      } catch (e) {
        if (e instanceof ApiError && e.status === 400) {
          try {
            console.warn('[AI] Anthropic 400 - retrying with no history')
            const reply = await callAnthropic(anthropicKey, systemPrompt, [{ role: 'user', content: message }])
            saveSession(session_id, [], message, reply, intent, meta)
            return NextResponse.json({ reply, intent })
          } catch (e2) {
            console.error('[AI] Anthropic retry-without-history also failed:', e2)
          }
        }
        console.error('[AI] Anthropic failed, falling back to next provider:', e instanceof Error ? e.message : e)
        // Fall through to the next configured provider instead of surfacing
        // a generic error, as long as one more key is configured.
        if (!groqKey && !geminiKey && !openrouterKey) throw e
      }
    }

    // ── Provider fallback chain: Groq → Gemini → OpenRouter ────────────────
    // Whichever env vars are actually set get tried in this order; each
    // failure logs the real reason server-side and moves to the next one
    // instead of giving up after a single provider's outage/deprecation.
    const providers: { name: string; key?: string; call: (key: string) => Promise<string> }[] = [
      { name: 'Groq', key: groqKey, call: (k) => callGroq(k, systemPrompt, chatMessages) },
      { name: 'Gemini', key: geminiKey, call: (k) => callGemini(k, systemPrompt, chatMessages) },
      { name: 'OpenRouter', key: openrouterKey, call: (k) => callOpenRouter(k, systemPrompt, chatMessages) },
    ]

    let lastErr: unknown = null
    for (const p of providers) {
      if (!p.key) continue
      try {
        const reply = await p.call(p.key)
        saveSession(session_id, history ?? [], message, reply, intent, meta)
        return NextResponse.json({ reply, intent })
      } catch (e) {
        console.error(`[AI] ${p.name} failed:`, e instanceof Error ? e.message : e)
        lastErr = e
      }
    }

    if (lastErr) throw lastErr
    return NextResponse.json(
      { reply: 'AI provider is not configured correctly. Please check ANTHROPIC_API_KEY / GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY.' },
      { status: 503 }
    )

  } catch (e) {
    if (e instanceof ApiError) {
      console.error(`[AI] ApiError ${e.status}:`, e.message)
      if (e.status === 401) return NextResponse.json({ reply: 'API key is invalid. Please check your environment variables.' })
      if (e.status === 429) return NextResponse.json({ reply: 'Rate limit reached. Please wait a moment and try again!' })
      if (e.status === 400) return NextResponse.json({ reply: 'There was a problem with the request format. Please refresh and try again.' })
      return NextResponse.json({ reply: 'The AI service is temporarily unavailable. Please try again in a moment.' })
    }
    console.error('[AI] Unexpected error:', e)
    return NextResponse.json({ reply: 'Something went wrong. Please try again!' })
  }
}

