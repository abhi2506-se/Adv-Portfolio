import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalUser, PortalAuthError } from "@/lib/portal/auth"
import { getServerSupabase, getServiceSupabase } from "@/lib/portal/supabase"
import { translateText } from "@/lib/portal/translate"
import { notifyClient } from "@/lib/portal/notify"

const SendSchema = z.object({
  text: z.string().min(1).max(4000),
  originalLang: z.string().min(2).max(10), // language the sender is typing in
})

const ADMIN_WORKING_LANG = "en" // Abhishek types/reads in English

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser()
    const { id: projectId } = await params
    const supabase = await getServerSupabase()

    const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single()
    if (!project || (user.role !== "admin" && project.client_id !== user.id)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 })
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, sender_id, sender_role, original_text, original_lang, is_read, created_at, translations(target_lang, translated_text)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: "Could not load messages." }, { status: 500 })

    // Mark messages sent by "the other party" as read for this viewer.
    const otherRole = user.role === "admin" ? "client" : "admin"
    await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("sender_role", otherRole)
      .eq("is_read", false)

    return NextResponse.json({ messages })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser()
    const { id: projectId } = await params
    const parsed = SendSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid message." }, { status: 400 })

    const supabase = await getServerSupabase()
    const { data: project } = await supabase
      .from("projects")
      .select("client_id, preferred_language")
      .eq("id", projectId)
      .single()
    if (!project || (user.role !== "admin" && project.client_id !== user.id)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 })
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        project_id: projectId,
        sender_id: user.id,
        sender_role: user.role,
        original_text: parsed.data.text,
        original_lang: parsed.data.originalLang,
      })
      .select()
      .single()
    if (error || !message) return NextResponse.json({ error: "Could not send message." }, { status: 500 })

    // Translate server-side, into whichever language the *other* party
    // reads in. Client -> reads English (admin's working language) when
    // admin sends; admin's message -> client's preferred_language.
    const targetLang = user.role === "admin" ? project.preferred_language : ADMIN_WORKING_LANG

    try {
      const result = await translateText({
        text: parsed.data.text,
        targetLang,
        sourceLang: parsed.data.originalLang,
      })
      const service = getServiceSupabase()
      await service.from("translations").insert({
        message_id: message.id,
        target_lang: targetLang,
        translated_text: result.translatedText,
        provider: result.provider,
      })
    } catch (translateErr) {
      // Chat must not fail just because translation is unavailable — the
      // original message is already saved. We log and continue; the UI
      // falls back to showing the original text with a "translation
      // unavailable" note when no translations row exists.
      console.error("[messages.POST] translation failed", translateErr)
    }

    const otherPartyClientId = user.role === "admin" ? project.client_id : null
    if (otherPartyClientId) {
      await notifyClient({
        clientId: otherPartyClientId,
        projectId,
        type: "message",
        title: "New message from your project team",
        body: parsed.data.text.slice(0, 140),
      })
    }

    return NextResponse.json({ ok: true, message })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
