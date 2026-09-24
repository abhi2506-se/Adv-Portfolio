/**
 * lib/supabase-realtime.ts
 *
 * We use Supabase ONLY as a realtime pub/sub transport (Broadcast channels)
 * for Live Chat — messages, presence, typing and WebRTC call signalling.
 * All persistent data (chats, messages, saved chats) still lives in your
 * existing Neon Postgres via lib/db.ts. Nothing about your current DB
 * changes.
 *
 * Required env vars (Supabase → Project Settings → API):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (safe to expose to the browser)
 *   SUPABASE_SERVICE_ROLE_KEY       (server-only, never expose to client)
 *
 * Realtime → Broadcast must be enabled on your Supabase project
 * (Settings → Realtime). No database tables in Supabase are required.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

/** Browser-side client used by React components/hooks to subscribe to a chat channel. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[live-chat] Supabase Realtime is NOT configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from this build). ' +
        'Calls will not connect and messaging will only work via polling. ' +
        'If you already added these in Vercel, you must trigger a fresh deploy — NEXT_PUBLIC_* vars are baked in at build time, not read at runtime.'
      )
    }
    return null
  }
  if (!browserClient) {
    browserClient = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 20 } },
    })
  }
  return browserClient
}

export function chatChannelName(chatId: string) {
  return `live-chat:${chatId}`
}

/**
 * Server-side "fire and forget" broadcast — sends an event to every browser
 * subscribed to this chat's channel, WITHOUT opening/maintaining a
 * websocket from the serverless function (uses Supabase's Broadcast REST
 * endpoint). Safe to call from any API route after writing to Neon.
 */
export async function broadcastToChat(chatId: string, event: string, payload: Record<string, any>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return // realtime not configured — caller should still work via polling fallback

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        messages: [{ topic: chatChannelName(chatId), event, payload, private: false }],
      }),
    })
  } catch (e) {
    console.error('[supabase-realtime] broadcast failed:', e)
  }
}
