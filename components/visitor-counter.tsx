'use client';

import { useState, useEffect } from 'react';

function getOrCreateSessionId(): string {
  const KEY = 'portfolio_visitor_sid';
  try {
    let sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export default function VisitorCounter() {
  const [total, setTotal] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const record = async () => {
      try {
        // Register this visitor session so it's counted
        const res = await fetch('/api/visitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: getOrCreateSessionId(),
            page: window.location.pathname,
          }),
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setTotal(data.total ?? 0);
            setActive(data.active ?? 0);
          }
        }
      } catch {
        // On error, try a GET fallback
        try {
          const res = await fetch('/api/visitors', { cache: 'no-store' });
          if (res.ok && !cancelled) {
            const data = await res.json();
            setTotal(data.total ?? 0);
            setActive(data.active ?? 0);
          }
        } catch {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    record();

    // Poll every 30 seconds to keep active count fresh
    const iv = setInterval(async () => {
      try {
        const res = await fetch('/api/visitors', { cache: 'no-store' });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTotal(data.total ?? 0);
          setActive(data.active ?? 0);
        }
      } catch {}
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
      {/* Live / Active */}
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-green-600 dark:text-green-500 font-semibold">{active ?? 0}</span>
        <span>online now</span>
      </span>

      <span className="text-border">·</span>

      {/* Total */}
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground font-medium">
          {total !== null ? total.toLocaleString() : '—'} total visitors
        </span>
      </span>
    </div>
  );
}
