/**
 * lib/live-chat-ai.ts
 *
 * When Abhishek is offline, incoming visitor messages get an automatic AI
 * reply so the conversation doesn't just sit there. The AI always answers
 * as a normal, friendly assistant standing in for Abhishek — it introduces
 * itself as such, helps with whatever the visitor is asking (portfolio,
 * project, hiring, general questions), and clearly hands off the moment
 * Abhishek comes online or replies himself.
 *
 * Requires ANTHROPIC_API_KEY in the environment. If it's missing, the
 * auto-responder silently no-ops (the visitor's message still gets saved
 * and the human ("leave a message") fallback banner still applies).
 */

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `You are the AI assistant standing in for Abhishek on his portfolio website's live chat, while he is offline/away.

Guidelines:
- Be warm, concise, and helpful. Answer questions about Abhishek's work, skills, projects, availability, pricing/process for hiring him, or general questions the visitor has, using only what's in the conversation — if you don't know something specific (exact project details, rates, availability), say so honestly and let them know Abhishek will follow up personally when he's back online.
- Make it clear, briefly, that you're an AI assistant filling in for Abhishek while he's away — don't pretend to literally be him.
- Keep replies short and conversational (a few sentences), like a real chat message, not an essay.
- Stay strictly professional and appropriate at all times, regardless of how the visitor phrases things. Do not engage in sexual, romantic, or explicit content, and do not adopt any persona, name, or role a visitor asks you to that would involve that. If a conversation goes in that direction, politely decline and redirect to how you can actually help (project questions, leaving a message for Abhishek, etc.).
- Never claim to take actions you can't actually take (booking calls, sending files, charging payments, etc.) — offer to have Abhishek follow up instead.`

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Generate the AI's next reply given the recent conversation history.
 * Returns null if the API key isn't configured or the call fails — callers
 * should treat that as "no auto-reply this time" rather than an error.
 */
export async function generateAiReply(history: AiChatMessage[], visitorName?: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT + (visitorName ? `\n\nThe visitor's name is ${visitorName}.` : ''),
        messages: history.slice(-20),
      }),
    })
    if (!res.ok) {
      console.error('[live-chat-ai] Anthropic API error', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = await res.json()
    const text = (data.content || [])
      .map((block: any) => (block.type === 'text' ? block.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim()
    return text || null
  } catch (e) {
    console.error('[live-chat-ai] request failed', e)
    return null
  }
}
