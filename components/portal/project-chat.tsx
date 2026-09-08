"use client"

import { useEffect, useRef, useState } from "react"
import { getBrowserSupabase } from "@/lib/portal/supabase-browser"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  sender_id: string
  sender_role: "client" | "admin"
  original_text: string
  original_lang: string
  created_at: string
  translations?: { target_lang: string; translated_text: string }[]
}

export function ProjectChat({
  projectId,
  currentUserId,
  currentUserRole,
  myLanguage,
}: {
  projectId: string
  currentUserId: string
  currentUserRole: "client" | "admin"
  myLanguage: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [othersTyping, setOthersTyping] = useState(false)
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof getBrowserSupabase>["channel"]> | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/portal/projects/${projectId}/messages`)
      .then((r) => r.json())
      .then((d) => { if (active) setMessages(d.messages ?? []) })
    return () => { active = false }
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getBrowserSupabase>["channel"]> | null = null
    let cancelled = false

    async function setup() {
      const supabase = getBrowserSupabase()
      // Authenticate the browser client so Postgres RLS applies to this
      // realtime subscription (see /api/portal/realtime-token for why).
      const tokenRes = await fetch("/api/portal/realtime-token")
      if (tokenRes.ok) {
        const { accessToken, refreshToken } = await tokenRes.json()
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      }
      if (cancelled) return

      const ch = supabase
        .channel(`project-${projectId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message])
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "translations" },
          (payload) => {
            const t = payload.new as any
            setMessages((prev) =>
              prev.map((m) =>
                m.id === t.message_id
                  ? { ...m, translations: [...(m.translations ?? []), t] }
                  : m
              )
            )
          }
        )
        .on("presence", { event: "sync" }, () => {
          const state = ch.presenceState()
          const typing = Object.values(state)
            .flat()
            .some((p: any) => p.typing && p.userId !== currentUserId)
          setOthersTyping(typing)
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await ch.track({ userId: currentUserId, typing: false, online_at: new Date().toISOString() })
          }
        })

      channel = ch
      channelRef.current = ch
    }

    setup()

    return () => {
      cancelled = true
      if (channel) getBrowserSupabase().removeChannel(channel)
    }
  }, [projectId, currentUserId])

  function handleTyping(value: string) {
    setDraft(value)
    channelRef.current?.track({ userId: currentUserId, typing: true })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      channelRef.current?.track({ userId: currentUserId, typing: false })
    }, 2000)
  }

  async function sendMessage() {
    if (!draft.trim()) return
    setSending(true)
    const text = draft
    setDraft("")
    try {
      await fetch(`/api/portal/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, originalLang: myLanguage }),
      })
    } finally {
      setSending(false)
    }
  }

  function displayText(m: Message) {
    if (m.sender_id === currentUserId) return m.original_text
    const t = m.translations?.find((t) => t.target_lang === myLanguage)
    if (!t) return m.original_text // translation pending/unavailable — show original
    return showOriginal[m.id] ? m.original_text : t.translated_text
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-lg">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId
            const hasTranslation = !mine && m.translations?.some((t) => t.target_lang === myLanguage)
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p>{displayText(m)}</p>
                  {hasTranslation && (
                    <button
                      className="text-[10px] opacity-70 underline mt-1"
                      onClick={() => setShowOriginal((s) => ({ ...s, [m.id]: !s[m.id] }))}
                    >
                      {showOriginal[m.id] ? "Show translation" : "Show original"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {othersTyping && <p className="text-xs text-muted-foreground italic">typing…</p>}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="border-t p-3 flex gap-2">
        <Textarea
          rows={1}
          value={draft}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Type a message…"
          className="resize-none"
        />
        <Button onClick={sendMessage} disabled={sending || !draft.trim()}>Send</Button>
      </div>
    </div>
  )
}
