'use client'

import { X, Forward } from 'lucide-react'

interface ForwardPickerProps {
  open: boolean
  chats: { id: string; user_name: string }[]
  excludeChatId?: string
  onPick: (chatId: string) => void
  onClose: () => void
}

/** Admin-only: pick another visitor's chat to forward a message into. */
export function ForwardPicker({ open, chats, excludeChatId, onPick, onClose }: ForwardPickerProps) {
  if (!open) return null
  const options = chats.filter(c => c.id !== excludeChatId)
  return (
    <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl p-4 max-w-sm w-full shadow-2xl max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold flex items-center gap-2"><Forward className="w-4 h-4" /> Forward to…</p>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto space-y-1">
          {options.length === 0 && <p className="text-white/40 text-sm text-center py-6">No other chats to forward to.</p>}
          {options.map(c => (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm"
            >
              {c.user_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
