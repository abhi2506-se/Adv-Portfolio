/**
 * lib/live-chat-wallpapers.ts
 *
 * Shared wallpaper catalogue for Live Chat. A single source of truth used
 * by both the User panel and the Admin panel so a wallpaper picked on
 * either side renders identically on the other.
 *
 * Every preset carries:
 *  - `background`  → CSS for the chat body background (solid / gradient)
 *  - `bubble`       → derived message-bubble colors (auto-contrast so text
 *                      always stays readable against the new background)
 *  - `live`         → optional animated overlay type ('hearts' | 'roses')
 *                      rendered by <LiveWallpaperOverlay />
 *
 * Nothing here touches the DB — lib/live-chat-db.ts persists just the
 * `id` string; everything visual is looked up from this table so adding a
 * new wallpaper never requires a migration.
 */

export interface ChatBubbleColors {
  mineFrom: string
  mineTo: string
  mineText: string
  theirBg: string
  theirText: string
}

export interface ChatWallpaper {
  id: string
  name: string
  /** Small swatch shown in the picker grid. */
  swatch: string
  /** Full CSS `background` value applied to the chat body. */
  background: string
  bubble: ChatBubbleColors
  live?: 'hearts' | 'roses' | 'confetti'
}

const DEFAULT_BUBBLE: ChatBubbleColors = {
  mineFrom: '#7c3aed',
  mineTo: '#2563eb',
  mineText: '#ffffff',
  theirBg: 'var(--muted)',
  theirText: 'var(--foreground)',
}

export const CHAT_WALLPAPERS: ChatWallpaper[] = [
  {
    id: 'default',
    name: 'Default',
    swatch: 'var(--background)',
    background: 'var(--background)',
    bubble: DEFAULT_BUBBLE,
  },
  // ── Solid colours ────────────────────────────────────────────────────
  {
    id: 'midnight',
    name: 'Midnight',
    swatch: '#0f172a',
    background: '#0f172a',
    bubble: { mineFrom: '#4f46e5', mineTo: '#4338ca', mineText: '#ffffff', theirBg: '#1e293b', theirText: '#e2e8f0' },
  },
  {
    id: 'forest',
    name: 'Forest',
    swatch: '#0b3d2e',
    background: '#0b3d2e',
    bubble: { mineFrom: '#16a34a', mineTo: '#15803d', mineText: '#ffffff', theirBg: '#123d2e', theirText: '#dcfce7' },
  },
  {
    id: 'sand',
    name: 'Sand',
    swatch: '#f5e6c8',
    background: '#f5e6c8',
    bubble: { mineFrom: '#d97706', mineTo: '#b45309', mineText: '#ffffff', theirBg: '#fff7e6', theirText: '#5b3d17' },
  },
  {
    id: 'slate',
    name: 'Slate',
    swatch: '#334155',
    background: '#334155',
    bubble: { mineFrom: '#0ea5e9', mineTo: '#0284c7', mineText: '#ffffff', theirBg: '#475569', theirText: '#f1f5f9' },
  },
  // ── Gradients ────────────────────────────────────────────────────────
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: 'linear-gradient(135deg,#ff7e5f,#feb47b)',
    background: 'linear-gradient(160deg,#ff7e5f 0%,#feb47b 100%)',
    bubble: { mineFrom: '#c2410c', mineTo: '#9a3412', mineText: '#ffffff', theirBg: 'rgba(255,255,255,0.82)', theirText: '#7c2d12' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    swatch: 'linear-gradient(135deg,#2193b0,#6dd5ed)',
    background: 'linear-gradient(160deg,#2193b0 0%,#6dd5ed 100%)',
    bubble: { mineFrom: '#0e7490', mineTo: '#155e75', mineText: '#ffffff', theirBg: 'rgba(255,255,255,0.85)', theirText: '#0c4a6e' },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    swatch: 'linear-gradient(135deg,#360033,#0b8793)',
    background: 'linear-gradient(160deg,#360033 0%,#0b8793 100%)',
    bubble: { mineFrom: '#a855f7', mineTo: '#7e22ce', mineText: '#ffffff', theirBg: 'rgba(15,10,25,0.55)', theirText: '#f3e8ff' },
  },
  {
    id: 'candy',
    name: 'Candy',
    swatch: 'linear-gradient(135deg,#ff9a9e,#fad0c4)',
    background: 'linear-gradient(160deg,#ff9a9e 0%,#fad0c4 100%)',
    bubble: { mineFrom: '#db2777', mineTo: '#be185d', mineText: '#ffffff', theirBg: 'rgba(255,255,255,0.85)', theirText: '#831843' },
  },
  {
    id: 'mint',
    name: 'Mint',
    swatch: 'linear-gradient(135deg,#a8ff78,#78ffd6)',
    background: 'linear-gradient(160deg,#a8ff78 0%,#78ffd6 100%)',
    bubble: { mineFrom: '#059669', mineTo: '#047857', mineText: '#ffffff', theirBg: 'rgba(255,255,255,0.85)', theirText: '#064e3b' },
  },
  {
    id: 'noir',
    name: 'Noir',
    swatch: 'linear-gradient(135deg,#000000,#434343)',
    background: 'linear-gradient(160deg,#000000 0%,#434343 100%)',
    bubble: { mineFrom: '#525252', mineTo: '#262626', mineText: '#ffffff', theirBg: 'rgba(255,255,255,0.08)', theirText: '#e5e5e5' },
  },
  // ── Live / animated wallpapers ───────────────────────────────────────
  {
    id: 'love',
    name: 'Love ❤️',
    swatch: 'linear-gradient(135deg,#ff5f6d,#ffc371)',
    background: 'linear-gradient(160deg,#4a0d1f 0%,#8f1b3d 45%,#c92a5c 100%)',
    bubble: { mineFrom: '#e11d48', mineTo: '#be123c', mineText: '#ffffff', theirBg: 'rgba(255,255,255,0.14)', theirText: '#ffe4e6' },
    live: 'hearts',
  },
  {
    id: 'roses',
    name: 'Roses 🌹',
    swatch: 'linear-gradient(135deg,#7f1d1d,#dc2626)',
    background: 'linear-gradient(160deg,#2b0707 0%,#5c1010 45%,#7f1d1d 100%)',
    bubble: { mineFrom: '#dc2626', mineTo: '#991b1b', mineText: '#ffffff', theirBg: 'rgba(255,255,255,0.12)', theirText: '#fecaca' },
    live: 'roses',
  },
  {
    id: 'celebration',
    name: 'Celebration 🎉',
    swatch: 'linear-gradient(135deg,#f6d365,#fda085)',
    background: 'linear-gradient(160deg,#1e1b4b 0%,#4c1d95 100%)',
    bubble: { mineFrom: '#f59e0b', mineTo: '#d97706', mineText: '#1c1917', theirBg: 'rgba(255,255,255,0.14)', theirText: '#fef3c7' },
    live: 'confetti',
  },
]

export function getWallpaper(id?: string | null): ChatWallpaper {
  return CHAT_WALLPAPERS.find(w => w.id === id) || CHAT_WALLPAPERS[0]
}

/** CSS custom properties to spread onto a wrapper element's `style` prop
 *  so every MessageBubble underneath auto-adapts its colors. */
export function wallpaperCssVars(wallpaper: ChatWallpaper): Record<string, string> {
  return {
    '--lc-bg': wallpaper.background,
    '--lc-mine-from': wallpaper.bubble.mineFrom,
    '--lc-mine-to': wallpaper.bubble.mineTo,
    '--lc-mine-text': wallpaper.bubble.mineText,
    '--lc-their-bg': wallpaper.bubble.theirBg,
    '--lc-their-text': wallpaper.bubble.theirText,
  }
}
