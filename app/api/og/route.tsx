// ─── GET /api/og?title=...&description=...&tags=... ───────────────────────────
// Generates dynamic OpenGraph images using Next.js ImageResponse
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'Project'
  const description = searchParams.get('description') || ''
  const tags = (searchParams.get('tags') || '').split(',').filter(Boolean).slice(0, 5)
  const stars = searchParams.get('stars') || '0'
  const lang = searchParams.get('lang') || 'TypeScript'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1526 50%, #0a0f1e 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: -100, left: -100,
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: 12, width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: 'white', fontWeight: 800,
          }}>
            {title.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'rgba(148,163,184,0.8)', fontSize: 14, letterSpacing: 2 }}>
              AI PROJECT INTELLIGENCE
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#fbbf24', fontSize: 16 }}>★</span>
            <span style={{ color: 'rgba(248,250,252,0.9)', fontSize: 14, fontWeight: 600 }}>{stars}</span>
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 52, fontWeight: 800, color: '#f8fafc',
          lineHeight: 1.1, marginBottom: 16, flex: 1,
        }}>
          {title.length > 40 ? title.slice(0, 40) + '…' : title}
        </div>

        {/* Description */}
        {description && (
          <div style={{
            fontSize: 20, color: 'rgba(148,163,184,0.9)',
            lineHeight: 1.5, marginBottom: 32, maxWidth: 800,
          }}>
            {description.length > 120 ? description.slice(0, 120) + '…' : description}
          </div>
        )}

        {/* Tags & language */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {tags.map((tag: string) => (
            <div key={tag} style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 8, padding: '6px 14px',
              color: '#93c5fd', fontSize: 14, fontWeight: 600,
            }}>
              {tag}
            </div>
          ))}
          {lang && (
            <div style={{
              marginLeft: 'auto',
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 8, padding: '6px 14px',
              color: '#c4b5fd', fontSize: 14, fontWeight: 600,
            }}>
              {lang}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
        }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
