'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient, chatChannelName } from '@/lib/supabase-realtime'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface LiveChatRealtimeHandlers {
  onNewMessage?: (message: any) => void
  onMessageUpdated?: (message: any) => void
  onReceiptsUpdated?: (ids: string[], status: 'delivered' | 'read') => void
  onTyping?: (role: 'user' | 'admin') => void
  onPresence?: (role: 'user' | 'admin', info: { status: string; awaySeconds: number }) => void
  onChatEnded?: (by: 'user' | 'admin', reason?: string | null) => void
  onChatUpdated?: (payload: any) => void
  onCallSignal?: (payload: any) => void
  onHistoryHidden?: (payload: { hidden: boolean; hiddenAt: number | null }) => void
  /** Fired when either side (user or admin) changes this chat's wallpaper,
   *  so the other side updates instantly without a page refresh. */
  onWallpaperChanged?: (payload: { chatId: string; wallpaperId: string; updatedBy: 'user' | 'admin' }) => void
  /** Fired when an admin permanently deletes this chat. */
  onChatDeleted?: (payload: { chatId: string }) => void
}

/**
 * Subscribes to the Supabase Realtime Broadcast channel for a single chat.
 * If Supabase env vars aren't set, this becomes a no-op — the rest of the
 * app keeps working via the existing polling (just less instant), so
 * nothing breaks when Realtime isn't configured yet.
 */
export function useLiveChatRealtime(chatId: string | null, handlers: LiveChatRealtimeHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!chatId) return
    const client = getSupabaseBrowserClient()
    if (!client) return // not configured -> polling fallback covers everything

    const channel = client.channel(chatChannelName(chatId), { config: { broadcast: { self: false } } })

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => handlersRef.current.onNewMessage?.(payload.message))
      .on('broadcast', { event: 'message_updated' }, ({ payload }) => handlersRef.current.onMessageUpdated?.(payload.message))
      .on('broadcast', { event: 'receipts_updated' }, ({ payload }) => handlersRef.current.onReceiptsUpdated?.(payload.ids, payload.status))
      .on('broadcast', { event: 'typing' }, ({ payload }) => handlersRef.current.onTyping?.(payload.role))
      .on('broadcast', { event: 'presence' }, ({ payload }) => handlersRef.current.onPresence?.(payload.role, payload))
      .on('broadcast', { event: 'chat_ended' }, ({ payload }) => handlersRef.current.onChatEnded?.(payload.by, payload.reason))
      .on('broadcast', { event: 'chat_updated' }, ({ payload }) => handlersRef.current.onChatUpdated?.(payload))
      .on('broadcast', { event: 'call_signal' }, ({ payload }) => handlersRef.current.onCallSignal?.(payload))
      .on('broadcast', { event: 'history_hidden' }, ({ payload }) => handlersRef.current.onHistoryHidden?.(payload))
      .on('broadcast', { event: 'wallpaper_changed' }, ({ payload }) => handlersRef.current.onWallpaperChanged?.(payload))
      .on('broadcast', { event: 'chat_deleted' }, ({ payload }) => handlersRef.current.onChatDeleted?.(payload))
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') console.log(`[live-chat] Realtime connected for chat ${chatId}`)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`[live-chat] Realtime channel error for chat ${chatId}:`, status, err)
      })

    channelRef.current = channel
    return () => { client.removeChannel(channel); channelRef.current = null }
  }, [chatId])

  /** Send a WebRTC signalling message (offer/answer/ice/end/reject) directly, peer-to-peer via the channel — no server round-trip needed for calls. */
  const sendCallSignal = (payload: any) => {
    if (!channelRef.current) {
      console.error('[live-chat] Cannot send call signal — Realtime channel not connected. Calls will not work until Supabase env vars are set AND the app has been redeployed.')
      return
    }
    channelRef.current.send({ type: 'broadcast', event: 'call_signal', payload })
  }

  return { sendCallSignal, connected: !!channelRef.current }
}
