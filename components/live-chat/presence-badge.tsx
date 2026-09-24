'use client'

import { useEffect, useState } from 'react'
import type { PresenceInfo } from '@/hooks/use-presence'
import { formatLastSeen } from '@/hooks/use-presence'

export function PresenceBadge({ info, label }: { info: PresenceInfo; label?: string }) {
  const [seconds, setSeconds] = useState(info.awaySeconds)

  useEffect(() => { setSeconds(info.awaySeconds) }, [info.awaySeconds, info.status])

  useEffect(() => {
    if (info.status !== 'away') return
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [info.status])

  const dotColor = info.status === 'online' ? 'bg-green-500' : info.status === 'away' ? 'bg-yellow-500' : 'bg-red-500'
  const text = info.status === 'online'
    ? (label ? `${label} · Online` : 'Online')
    : info.status === 'away'
      ? `${label ? label + ' · ' : ''}Away · ${seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`}`
      // WhatsApp-style: offline shows a "last seen" timestamp instead of just "Offline".
      : `${label ? label + ' · ' : ''}${formatLastSeen(info.lastActiveAt)}`

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`w-2 h-2 rounded-full ${dotColor} ${info.status === 'online' ? 'animate-pulse' : ''}`} />
      <span className="text-muted-foreground">{text}</span>
    </span>
  )
}
