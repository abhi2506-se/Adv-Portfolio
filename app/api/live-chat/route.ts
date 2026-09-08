import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import nodemailer from 'nodemailer'
import { verifyToken } from '@/lib/admin-auth'
import { CO_ADMIN_SESSION_COOKIE, verifyCoAdminToken } from '@/lib/co-admin-auth'
import { sendPushToAdmin } from '@/lib/notifications'
import { SUPPORT_FROM } from '@/lib/mail-identities'
import { getOrCreateDeviceId, attachDeviceCookie } from '@/lib/device-id'
import { broadcastToChat } from '@/lib/supabase-realtime'
import {
  ensureLiveChatSchema, insertMessage, editMessage, unsendMessage,
  markDelivered, markRead, saveChat, unsaveChat, getSavedChats,
  endChat, getReturningUserInfo, approveChat, reopenChat, viewMedia, maskMediaForTransport,
  getRecentMessages, getArchiveMessages, requestArchiveAccess, grantArchiveAccess,
  denyArchiveAccess, getArchiveStatus, setHistoryHiddenFromUser, getHistoryHiddenStatus,
  toggleReaction, toggleStar, forwardMessage, getAdminOnlineStatus, setAiActive,
  getChatWallpaper, setChatWallpaper, applyReturningWallpaper, deleteChatPermanently,
  getChatMedia,
} from '@/lib/live-chat-db'
import { generateAiReply } from '@/lib/live-chat-ai'

const SESSION_COOKIE = 'portfolio_admin_session'
const sql = neon(process.env.DATABASE_URL!)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

// ── In-memory typing state (best-effort only; real delivery uses Supabase
//    Realtime broadcast below, this stays as a polling fallback) ──────────
const typingState = new Map<string, { role: 'user' | 'admin'; ts: number }>()
const TYPING_TTL = 4000

function isAdminAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  if (cookie?.value && verifyToken(cookie.value)) return true
  // A co-admin counts as "admin" here only if granted the live_chat permission.
  const coCookie = req.cookies.get(CO_ADMIN_SESSION_COOKIE)
  const coPayload = coCookie?.value ? verifyCoAdminToken(coCookie.value) : null
  return !!coPayload && coPayload.permissions.includes('live_chat')
}

// POST /api/live-chat
export async function POST(req: NextRequest) {
  try {
    await ensureLiveChatSchema()
    const body = await req.json()
    const { action } = body
    const { deviceId, isNew, token } = getOrCreateDeviceId(req)

    // ── Start new chat request (now device-aware: auto Continue Chat) ─────
    if (action === 'start') {
      const { userName, userEmail, userPhone, sessionId, initialMessage } = body
      if (!userName?.trim() || !initialMessage?.trim()) {
        return NextResponse.json({ error: 'Name and message required' }, { status: 400 })
      }
      const cleanPhone = (userPhone || '').trim().replace(/[^\d+]/g, '').slice(0, 20)

      // Returning + eligible user with a still-open session -> resume it.
      // Matches by phone number first (works across devices/browsers), then
      // falls back to the device cookie. A phone match always continues the
      // same thread — reopening it first if it had previously been ended.
      const { eligible, recentChat } = await getReturningUserInfo(deviceId, cleanPhone)
      if (recentChat) {
        if (recentChat.status === 'closed') await reopenChat(recentChat.id, eligible)
        // Restore this visitor's saved wallpaper (by phone number) if this
        // chat doesn't already have one set — keeps it "permanent" across
        // reopened/resumed sessions, even from a different device.
        if (cleanPhone) await applyReturningWallpaper(recentChat.id, cleanPhone).catch(() => {})
        const { message } = await insertMessage({ chatId: recentChat.id, role: 'user', content: initialMessage })
        await broadcastToChat(recentChat.id, 'new_message', { message })
        if (recentChat.status === 'closed') {
          await broadcastToChat(recentChat.id, 'chat_updated', { status: eligible ? 'active' : 'pending' })
          sendPushToAdmin({
            title: '🔁 Visitor is back — chat reopened',
            body: `${(recentChat.user_name || 'Visitor')}: "${initialMessage.trim().slice(0, 80)}${initialMessage.length > 80 ? '…' : ''}"`,
            tag: `live-chat-reopen-${recentChat.id}`,
            url: '/admin',
          }).catch(() => {})
        }
        const res = NextResponse.json({ ok: true, chatId: recentChat.id, resumed: true })
        return isNew ? attachDeviceCookie(res, token) : res
      }

      const chatId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const now = Date.now()
      const autoApprove = eligible // chatted with Admin in last 3 sessions -> skip approval

      await sql`INSERT INTO live_chats (id, session_id, user_name, user_email, user_phone, status, created_at, updated_at, device_id, approved)
        VALUES (${chatId}, ${sessionId || ''}, ${userName.trim().slice(0, 100)}, ${(userEmail || '').trim().slice(0, 200)}, ${cleanPhone},
                ${autoApprove ? 'active' : 'pending'}, ${now}, ${now}, ${deviceId}, ${autoApprove})`

      await insertMessage({ chatId, role: 'user', content: initialMessage })
      // New chat on a brand-new device -> pull in this visitor's remembered
      // wallpaper (matched by phone number) so it "just shows up" already.
      if (cleanPhone) await applyReturningWallpaper(chatId, cleanPhone).catch(() => {})

      if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ADMIN_EMAIL) {
        const receivedAt = new Date(now).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">💬 Live Chat Request</h1>
    <p style="margin:6px 0 0;color:#c4b5fd;font-size:14px;">A visitor wants to chat with you live!</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <div style="background:#0f172a;border-radius:10px;padding:16px 20px;margin-bottom:20px;border-left:3px solid #7c3aed;">
      <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;">From</p>
      <p style="margin:0 0 4px;color:#f1f5f9;font-weight:600;">${userName.trim()}</p>
      ${userEmail ? `<p style="margin:0;color:#60a5fa;font-size:13px;">${(userEmail || '').trim()}</p>` : ''}
      <p style="margin:12px 0 8px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;">Message</p>
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.7;">${initialMessage.trim().replace(/\n/g, '<br>')}</p>
    </div>
    <div style="background:#0f172a;border-radius:10px;padding:12px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#64748b;font-size:12px;">⏰ Received: <strong style="color:#94a3b8;">${receivedAt}</strong></p>
    </div>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://portfolio-v7-mauve.vercel.app'}/admin/dashboard" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-weight:600;font-size:14px;padding:14px;border-radius:10px;text-decoration:none;">
      Open Admin Panel to Chat →
    </a>
  </div>
  <p style="text-align:center;color:#475569;font-size:12px;margin-top:16px;">Abhishek Singh Portfolio — Live Chat Notification</p>
</div></body></html>`
        transporter.sendMail({ from: SUPPORT_FROM, to: process.env.ADMIN_EMAIL, subject: `💬 Live Chat Request from ${userName.trim()}`, html }).catch(() => {})
      }

      sendPushToAdmin({
        title: autoApprove ? '🟢 Returning visitor is chatting again!' : '🟢 New Live Chat Request!',
        body: `${userName.trim()}: "${initialMessage.trim().slice(0, 80)}${initialMessage.length > 80 ? '…' : ''}"`,
        tag: `live-chat-start-${chatId}`,
        url: '/admin',
      }).catch(() => {})

      const res = NextResponse.json({ ok: true, chatId, autoApproved: autoApprove })
      return isNew ? attachDeviceCookie(res, token) : res
    }

    // ── User sends message (text and/or media: image/video/voice-note/gif/sticker) ──
    if (action === 'message') {
      const { chatId, content, clientId, replyToId, mediaUrl, mediaType, mediaViewLimit, mediaKeep, durationMs } = body
      const hasMedia = !!mediaUrl
      if (!chatId || (!content?.trim() && !hasMedia)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      const validTypes = new Set(['image', 'video', 'audio', 'gif', 'sticker'])
      if (hasMedia && !validTypes.has(mediaType)) {
        return NextResponse.json({ error: 'Invalid media type' }, { status: 400 })
      }

      const chatRow = (await sql`SELECT device_id, user_name, status, ai_active FROM live_chats WHERE id = ${chatId}`)[0]
      if (!chatRow) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      if (chatRow.device_id && chatRow.device_id !== deviceId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      if (chatRow.status === 'closed') return NextResponse.json({ error: 'Chat has ended' }, { status: 409 })

      const { message, duplicate } = await insertMessage({
        chatId, role: 'user', content: (content || '').trim(), clientId, replyToId,
        mediaUrl: hasMedia ? mediaUrl : undefined, mediaType: hasMedia ? mediaType : undefined,
        mediaViewLimit: hasMedia ? mediaViewLimit : undefined,
        mediaKeep: hasMedia ? !!mediaKeep : undefined,
        durationMs: mediaType === 'audio' ? durationMs : undefined,
      })
      if (!duplicate) await broadcastToChat(chatId, 'new_message', { message: maskMediaForTransport(message, 'admin') })

      const visitorName = chatRow.user_name || 'Visitor'
      if (!duplicate) {
        const mediaLabel = mediaType === 'audio' ? 'voice note' : mediaType === 'gif' ? 'GIF' : mediaType === 'sticker' ? 'sticker' : mediaType
        sendPushToAdmin({
          title: hasMedia ? `📷 Live Chat ${mediaLabel}` : '💬 Live Chat Message',
          body: hasMedia ? `${visitorName} sent a ${mediaLabel}` : `${visitorName}: "${content.trim().slice(0, 80)}${content.length > 80 ? '…' : ''}"`,
          tag: `live-chat-${chatId}`,
          url: '/admin',
        }).catch(() => {})
      }

      // ── AI hybrid chat: Abhishek is offline -> let the AI answer ─────────
      if (!duplicate && !hasMedia && (content || '').trim()) {
        const { online } = await getAdminOnlineStatus()
        if (!online) {
          if (!chatRow.ai_active) await setAiActive(chatId, true)
          const recent = await sql`SELECT role, content FROM live_chat_messages
            WHERE chat_id = ${chatId} AND unsent_at IS NULL AND role IN ('user','admin','ai')
            ORDER BY created_at DESC LIMIT 20`
          const history = recent.reverse()
            .filter((m: any) => m.content)
            .map((m: any) => ({ role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.content }))
          const aiText = await generateAiReply(history, visitorName)
          if (aiText) {
            const { message: aiMessage } = await insertMessage({ chatId, role: 'ai', content: aiText })
            await broadcastToChat(chatId, 'new_message', { message: aiMessage })
          }
        }
      }

      // Reply to the sender with the un-masked message (they can always re-view their own send).
      const res = NextResponse.json({ ok: true, message })
      return isNew ? attachDeviceCookie(res, token) : res
    }

    // ── Admin replies (text and/or media) ───────────────────────────────
    if (action === 'admin_reply') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId, content, clientId, replyToId, mediaUrl, mediaType, mediaViewLimit, mediaKeep, durationMs } = body
      const hasMedia = !!mediaUrl
      if (!chatId || (!content?.trim() && !hasMedia)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      const validTypes = new Set(['image', 'video', 'audio', 'gif', 'sticker'])
      if (hasMedia && !validTypes.has(mediaType)) {
        return NextResponse.json({ error: 'Invalid media type' }, { status: 400 })
      }
      const chatRow = (await sql`SELECT ai_active FROM live_chats WHERE id = ${chatId}`)[0]
      const { message, duplicate } = await insertMessage({
        chatId, role: 'admin', content: (content || '').trim(), clientId, replyToId,
        mediaUrl: hasMedia ? mediaUrl : undefined, mediaType: hasMedia ? mediaType : undefined,
        mediaViewLimit: hasMedia ? mediaViewLimit : undefined,
        mediaKeep: hasMedia ? !!mediaKeep : undefined,
        durationMs: mediaType === 'audio' ? durationMs : undefined,
      })
      await sql`UPDATE live_chats SET status = 'active' WHERE id = ${chatId} AND status != 'closed'`
      if (!duplicate) await broadcastToChat(chatId, 'new_message', { message: maskMediaForTransport(message, 'user') })

      // Abhishek replying by hand also counts as taking over from the AI.
      if (chatRow?.ai_active) {
        await setAiActive(chatId, false)
        const { message: handoff } = await insertMessage({
          chatId, role: 'system',
          content: "Abhishek just joined the conversation. I'll let him take over from here. 🙂",
        })
        await broadcastToChat(chatId, 'new_message', { message: handoff })
      }
      return NextResponse.json({ ok: true, message })
    }

    // ── View a view-once media message (locks it after the max opens) ─────
    if (action === 'view_media') {
      const { chatId, messageId } = body
      if (!chatId || !messageId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      const role: 'user' | 'admin' = isAdminAuthed(req) ? 'admin' : 'user'
      if (role === 'user') {
        const chatRow = (await sql`SELECT device_id FROM live_chats WHERE id = ${chatId}`)[0]
        if (!chatRow || chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      const result = await viewMedia(chatId, messageId, role)
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
      if (result.publicMessage) await broadcastToChat(chatId, 'message_updated', { message: result.publicMessage })
      return NextResponse.json({ ok: true, url: result.url, mediaType: result.mediaType, viewsRemaining: result.viewsRemaining, locked: result.locked })
    }

    // ── Edit message (60s window, enforced server-side) ───────────────────
    if (action === 'edit_message') {
      const { chatId, messageId, content } = body
      const role: 'user' | 'admin' = isAdminAuthed(req) ? 'admin' : 'user'
      if (role === 'user') {
        const chatRow = (await sql`SELECT device_id FROM live_chats WHERE id = ${chatId}`)[0]
        if (!chatRow || chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      const result = await editMessage(chatId, messageId, role, content || '')
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
      await broadcastToChat(chatId, 'message_updated', { message: result.message })
      return NextResponse.json({ ok: true, message: result.message })
    }

    // ── Unsend message (15s window, enforced server-side) ─────────────────
    if (action === 'unsend_message') {
      const { chatId, messageId } = body
      const role: 'user' | 'admin' = isAdminAuthed(req) ? 'admin' : 'user'
      if (role === 'user') {
        const chatRow = (await sql`SELECT device_id FROM live_chats WHERE id = ${chatId}`)[0]
        if (!chatRow || chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      const result = await unsendMessage(chatId, messageId, role)
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
      await broadcastToChat(chatId, 'message_updated', { message: result.message })
      return NextResponse.json({ ok: true, message: result.message })
    }

    // ── React to a message (❤️ 😂 👍 🔥 😮 😢 — tap again to remove) ──────
    if (action === 'toggle_reaction') {
      const { chatId, messageId, emoji } = body
      const role: 'user' | 'admin' = isAdminAuthed(req) ? 'admin' : 'user'
      if (role === 'user') {
        const chatRow = (await sql`SELECT device_id FROM live_chats WHERE id = ${chatId}`)[0]
        if (!chatRow || chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      const result = await toggleReaction(chatId, messageId, role, emoji)
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
      await broadcastToChat(chatId, 'message_updated', { message: result.message })
      return NextResponse.json({ ok: true, message: result.message })
    }

    // ── Star / unstar a message (per-side; doesn't need to notify the other side) ──
    if (action === 'toggle_star') {
      const { chatId, messageId } = body
      const role: 'user' | 'admin' = isAdminAuthed(req) ? 'admin' : 'user'
      if (role === 'user') {
        const chatRow = (await sql`SELECT device_id FROM live_chats WHERE id = ${chatId}`)[0]
        if (!chatRow || chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      const result = await toggleStar(chatId, messageId, role)
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
      return NextResponse.json({ ok: true, message: result.message })
    }

    // ── Forward a message into another chat (admin only — visitors only
    //    have the one conversation, so there's nowhere for them to forward to) ──
    if (action === 'forward_message') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { fromChatId, messageId, toChatId } = body
      if (!fromChatId || !messageId || !toChatId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      const result = await forwardMessage(fromChatId, messageId, toChatId, 'admin')
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
      await sql`UPDATE live_chats SET status = 'active' WHERE id = ${toChatId} AND status != 'closed'`
      await broadcastToChat(toChatId, 'new_message', { message: maskMediaForTransport(result.message as any, 'user') })
      return NextResponse.json({ ok: true, message: result.message })
    }

    // ── Delivery / read receipts ──────────────────────────────────────────
    if (action === 'mark_delivered' || action === 'mark_read') {
      const { chatId } = body
      const role: 'user' | 'admin' = isAdminAuthed(req) ? 'admin' : 'user'
      const ids = action === 'mark_delivered' ? await markDelivered(chatId, role) : await markRead(chatId, role)
      if (ids.length) await broadcastToChat(chatId, 'receipts_updated', { ids, status: action === 'mark_delivered' ? 'delivered' : 'read' })
      return NextResponse.json({ ok: true, updated: ids.length })
    }

    // ── Admin: approve pending chat ────────────────────────────────────────
    if (action === 'approve') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId } = body
      await approveChat(chatId)
      await broadcastToChat(chatId, 'chat_updated', { status: 'active' })
      return NextResponse.json({ ok: true })
    }

    // ── Admin: save / unsave chat ──────────────────────────────────────────
    if (action === 'save_chat') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId, savedBy } = body
      await saveChat(chatId, savedBy || 'admin')
      return NextResponse.json({ ok: true })
    }
    if (action === 'unsave_chat') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId } = body
      await unsaveChat(chatId)
      return NextResponse.json({ ok: true })
    }

    // ── Admin: hide / show previous chat history from the user's side ─────
    // Nothing is deleted — the admin can always see everything, and can
    // restore the user's view of it at any time.
    if (action === 'hide_history') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId } = body
      const result = await setHistoryHiddenFromUser(chatId, true)
      await broadcastToChat(chatId, 'history_hidden', result)
      return NextResponse.json({ ok: true, ...result })
    }
    if (action === 'unhide_history') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId } = body
      const result = await setHistoryHiddenFromUser(chatId, false)
      await broadcastToChat(chatId, 'history_hidden', result)
      return NextResponse.json({ ok: true, ...result })
    }

    // ── Chat wallpaper — either side can change it; both sides see the new
    //    background + auto-matching bubble colors instantly via realtime.
    //    When the visitor's phone number is known, the choice is also
    //    remembered against that number so it comes back automatically on
    //    their next visit/device — until they choose to change it again. ──
    if (action === 'set_wallpaper') {
      const { chatId, wallpaperId } = body
      if (!chatId || !wallpaperId) return NextResponse.json({ error: 'chatId and wallpaperId required' }, { status: 400 })
      const admin = isAdminAuthed(req)
      const role: 'user' | 'admin' = admin ? 'admin' : 'user'
      const chatRow = (await sql`SELECT device_id, user_phone FROM live_chats WHERE id = ${chatId}`)[0]
      if (!chatRow) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      if (!admin && chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      const result = await setChatWallpaper(chatId, String(wallpaperId), role, chatRow.user_phone)
      await broadcastToChat(chatId, 'wallpaper_changed', { chatId, ...result })
      return NextResponse.json({ ok: true, ...result })
    }

    // ── Admin: permanently delete a particular chat ────────────────────────
    // Irreversible — removes the chat, all its messages, presence and call
    // log rows from the database. Only reachable after the admin confirms
    // the "Are you sure?" prompt client-side.
    if (action === 'admin_delete_chat') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId } = body
      if (!chatId) return NextResponse.json({ error: 'chatId required' }, { status: 400 })
      await broadcastToChat(chatId, 'chat_deleted', { chatId })
      await deleteChatPermanently(chatId)
      return NextResponse.json({ ok: true })
    }

    // ── End chat (either side) — instantly notifies the other side, with an
    //    optional reason, before the chat closes. No messages are ever
    //    deleted; they stay fully intact for the admin/archive. ────────────
    if (action === 'end_chat') {
      const { chatId, reason } = body
      const role: 'user' | 'admin' = isAdminAuthed(req) ? 'admin' : 'user'
      let visitorName = 'Visitor'
      if (role === 'user') {
        const chatRow = (await sql`SELECT device_id, user_name FROM live_chats WHERE id = ${chatId}`)[0]
        if (!chatRow || chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        visitorName = chatRow.user_name || 'Visitor'
      }
      const cleanReason = (reason || '').trim().slice(0, 300) || null
      await endChat(chatId, role, cleanReason || undefined)
      await broadcastToChat(chatId, 'chat_ended', { by: role, reason: cleanReason })
      if (role === 'user') {
        sendPushToAdmin({
          title: '👋 Visitor ended the chat',
          body: cleanReason ? `${visitorName}: "${cleanReason}"` : `${visitorName} ended the chat`,
          tag: `live-chat-ended-${chatId}`,
          url: '/admin',
        }).catch(() => {})
      }
      return NextResponse.json({ ok: true })
    }

    // ── Legacy: admin close / reopen via status ────────────────────────────
    if (action === 'update_status') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId, status } = body
      if (!chatId || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      await sql`UPDATE live_chats SET status = ${status}, updated_at = ${Date.now()} WHERE id = ${chatId}`
      if (status === 'closed') await broadcastToChat(chatId, 'chat_ended', { by: 'admin' })
      return NextResponse.json({ ok: true })
    }

    // ── Typing indicator ───────────────────────────────────────────────────
    if (action === 'typing') {
      const { chatId, role } = body
      if (!chatId || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      if (role === 'admin' && !isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      typingState.set(chatId, { role, ts: Date.now() })
      broadcastToChat(chatId, 'typing', { role }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    // ── Archive: visitor requests access to full history ───────────────────
    if (action === 'request_archive') {
      const { chatId } = body
      const chatRow = (await sql`SELECT device_id, user_name FROM live_chats WHERE id = ${chatId}`)[0]
      if (!chatRow) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      if (chatRow.device_id && chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      await requestArchiveAccess(chatId)
      sendPushToAdmin({
        title: '🗂️ Archive access requested',
        body: `${chatRow.user_name || 'A visitor'} wants to view their full chat history`,
        tag: `live-chat-archive-${chatId}`,
        url: '/admin',
      }).catch(() => {})
      const status = await getArchiveStatus(chatId)
      return NextResponse.json({ ok: true, ...status })
    }

    // ── Archive: admin approves or denies a visitor's request ──────────────
    if (action === 'grant_archive' || action === 'deny_archive') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { chatId } = body
      if (action === 'grant_archive') await grantArchiveAccess(chatId)
      else await denyArchiveAccess(chatId)
      const status = await getArchiveStatus(chatId)
      await broadcastToChat(chatId, 'archive_status', status)
      return NextResponse.json({ ok: true, ...status })
    }

    // ── Archive: fetch full history ─────────────────────────────────────────
    // Admin can always see it. A visitor can only once their request has
    // been approved by the admin (see request_archive / grant_archive above).
    if (action === 'get_archive') {
      const { chatId } = body
      const admin = isAdminAuthed(req)
      if (!admin) {
        const chatRow = (await sql`SELECT device_id FROM live_chats WHERE id = ${chatId}`)[0]
        if (!chatRow || chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        const status = await getArchiveStatus(chatId)
        if (!status.granted) return NextResponse.json({ error: 'Archive access has not been approved yet', ...status }, { status: 403 })
      }
      const { messages } = await getArchiveMessages(chatId)
      const viewerRole: 'user' | 'admin' = admin ? 'admin' : 'user'
      return NextResponse.json({ ok: true, messages: messages.map((m: any) => maskMediaForTransport(m, viewerRole)) })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[live-chat] POST error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET /api/live-chat — poll (fallback / initial load; realtime pushes updates live)
export async function GET(req: NextRequest) {
  try {
    await ensureLiveChatSchema()
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get('chatId')
    const adminMode = searchParams.get('admin')
    const savedMode = searchParams.get('saved')

    if (savedMode === '1') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const chats = await getSavedChats()
      const masked = chats.map((c: any) => ({ ...c, messages: (c.messages || []).map((m: any) => maskMediaForTransport(m, 'admin')) }))
      return NextResponse.json({ chats: masked })
    }

    if (adminMode === '1') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      // Recently-closed chats (last 30 min) stay visible too, so the admin
      // can instantly see who ended a chat and why before it drops off into
      // the dedicated "Ended" tab (see endedMode below).
      const recentCutoff = Date.now() - 30 * 60 * 1000
      const chats = await sql`SELECT * FROM live_chats
        WHERE saved = FALSE AND (status != 'closed' OR updated_at > ${recentCutoff})
        ORDER BY updated_at DESC LIMIT 50`
      const result = await Promise.all(chats.map(async (chat: any) => {
        const { messages, hasArchive } = await getRecentMessages(chat.id)
        const typing = typingState.get(chat.id)
        const isTyping = typing && (Date.now() - typing.ts) < TYPING_TTL ? typing.role : null
        return {
          ...chat,
          messages: messages.map((m: any) => maskMediaForTransport(m, 'admin')),
          hasArchive,
          typingRole: isTyping,
        }
      }))
      return NextResponse.json({ chats: result })
    }

    // ── Ended chats — every chat either side has ended, kept forever ────────
    // (unlike the 'admin' list above, this isn't time-limited — it's the
    // permanent home for a chat once it's closed, until/unless the same
    // visitor comes back and it's auto-reopened into Active.)
    if (searchParams.get('endedMode') === '1') {
      if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const chats = await sql`SELECT * FROM live_chats
        WHERE saved = FALSE AND status = 'closed'
        ORDER BY updated_at DESC LIMIT 100`
      const result = await Promise.all(chats.map(async (chat: any) => {
        const { messages, hasArchive } = await getRecentMessages(chat.id)
        return { ...chat, messages: messages.map((m: any) => maskMediaForTransport(m, 'admin')), hasArchive }
      }))
      return NextResponse.json({ chats: result })
    }

    // ── Chat Media gallery — every kept photo/video + every voice note,
    //    for both sides to browse (mirrors WhatsApp's per-chat media tab). ──
    if (chatId && searchParams.get('media') === '1') {
      const admin = isAdminAuthed(req)
      if (!admin) {
        const { deviceId } = getOrCreateDeviceId(req)
        const chatRow = (await sql`SELECT device_id FROM live_chats WHERE id = ${chatId}`)[0]
        if (!chatRow || chatRow.device_id !== deviceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      const media = await getChatMedia(chatId)
      return NextResponse.json({ ok: true, media })
    }

    if (chatId) {
      const { deviceId, isNew, token } = getOrCreateDeviceId(req)
      const chatRow = (await sql`SELECT device_id, status, saved, end_reason, ended_by_user, ended_by_admin,
        history_hidden_from_user, history_hidden_at, wallpaper_id FROM live_chats WHERE id = ${chatId}`)[0]
      if (chatRow?.device_id && chatRow.device_id !== deviceId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      const historyHidden = !!chatRow?.history_hidden_from_user
      const hiddenAt = chatRow?.history_hidden_at ? Number(chatRow.history_hidden_at) : null
      const { messages, hasArchive } = await getRecentMessages(chatId, undefined, historyHidden ? hiddenAt : null)
      // While the admin has hidden earlier history, archive requests are
      // paused too — there's nothing new to request until it's restored.
      const archiveStatus = historyHidden ? { requested: false, granted: false, requestedAt: null, grantedAt: null } : await getArchiveStatus(chatId)
      const typing = typingState.get(chatId)
      const adminTyping = typing && typing.role === 'admin' && (Date.now() - typing.ts) < TYPING_TTL
      const { online: adminOnline } = await getAdminOnlineStatus()
      const res = NextResponse.json({
        messages: messages.map((m: any) => maskMediaForTransport(m, 'user')),
        status: chatRow?.status || 'pending', adminTyping,
        hasArchive, archiveStatus,
        endReason: chatRow?.end_reason || null,
        endedBy: chatRow?.ended_by_user ? 'user' : chatRow?.ended_by_admin ? 'admin' : null,
        historyHidden: { hidden: historyHidden, hiddenAt },
        adminOnline,
        wallpaperId: chatRow?.wallpaper_id || 'default',
      })
      return isNew ? attachDeviceCookie(res, token) : res
    }

    return NextResponse.json({ error: 'Missing chatId' }, { status: 400 })
  } catch (e) {
    console.error('[live-chat] GET error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
