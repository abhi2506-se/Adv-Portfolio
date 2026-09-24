import { NextResponse } from 'next/server'
import { dbSaveAnalytic, dbGetTopQuestions, dbGetAnalyticsSummary } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { question, intent, session_id } = await req.json()
    if (!question?.trim()) return NextResponse.json({ ok: false })
    await dbSaveAnalytic({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      question: question.trim().slice(0, 500),
      intent: intent || 'general',
      session_id: session_id || '',
      created_at: Date.now(),
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[analytics] save error:', e)
    return NextResponse.json({ ok: false })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'summary'
    if (type === 'top') {
      const data = await dbGetTopQuestions(50)
      return NextResponse.json({ data })
    }
    const data = await dbGetAnalyticsSummary()
    return NextResponse.json({ data })
  } catch (e) {
    console.error('[analytics] get error:', e)
    return NextResponse.json({ data: null }, { status: 500 })
  }
}
