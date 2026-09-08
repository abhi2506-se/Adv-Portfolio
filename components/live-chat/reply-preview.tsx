'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { LiveChatMessage } from './message-bubble'

export function ReplyPreview({ message, onCancel }: { message: LiveChatMessage; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-muted border-l-2 border-violet-500 rounded-lg px-3 py-2 mb-2">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-violet-400">Replying to {message.role === 'admin' ? 'Abhishek' : 'You'}</p>
        <p className="text-xs text-muted-foreground truncate">{message.unsent_at ? 'Message unsent' : message.content}</p>
      </div>
      <button onClick={onCancel} className="p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

const QUICK_REASONS = ['Query resolved', 'No longer needed', 'Will contact later', 'Took too long', 'Other']

export function EndChatConfirm({
  open, onConfirm, onCancel, askReason = false,
}: {
  open: boolean
  onConfirm: (reason?: string) => void
  onCancel: () => void
  /** Show an (optional) reason field — used on the user side so the admin
   *  can instantly see *why* the visitor is ending the chat. */
  askReason?: boolean
}) {
  const [reason, setReason] = useState('')
  if (!open) return null
  const handleConfirm = () => {
    const r = reason.trim()
    setReason('')
    onConfirm(r || undefined)
  }
  const handleCancel = () => { setReason(''); onCancel() }
  return (
    <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4" onClick={handleCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
        <p className="text-white font-semibold mb-1.5">End this chat?</p>
        <p className="text-white/60 text-sm mb-4">
          {askReason
            ? "This will end the conversation and any active call. The admin will be notified right away."
            : "This will end the conversation and any active call for both sides. This can't be undone."}
        </p>
        {askReason && (
          <div className="mb-4">
            <p className="text-white/50 text-xs mb-1.5">Reason (optional) — shown to Admin instantly</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r === 'Other' ? reason : r)}
                  className={`text-[11px] px-2 py-1 rounded-full border ${reason === r ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/15 text-white/60 hover:bg-white/10'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value.slice(0, 300))}
              placeholder="e.g. Got my answer, thanks!"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none resize-none focus:border-violet-500"
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">Cancel</button>
          <button onClick={handleConfirm} className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-semibold">End Chat</button>
        </div>
      </div>
    </div>
  )
}

/** Admin-only "Are you sure?" confirmation before a chat is permanently
 *  deleted — deletion cannot be undone once confirmed. */
export function DeleteChatConfirm({
  open, userName, onConfirm, onCancel,
}: {
  open: boolean
  userName?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
        <p className="text-white font-semibold mb-1.5">Delete this chat?</p>
        <p className="text-white/60 text-sm mb-4">
          Are you sure you want to permanently delete{userName ? ` the conversation with ${userName}` : ' this conversation'}?
          Every message, media file and call log for it will be removed forever — this can't be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-semibold">Delete Permanently</button>
        </div>
      </div>
    </div>
  )
}
