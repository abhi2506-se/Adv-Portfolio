import { NextResponse } from 'next/server'
import { dbGetStories, dbSaveStory, dbDeleteStory } from '@/lib/db'

export async function GET() {
  try {
    const stories = await dbGetStories()
    return NextResponse.json(stories)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const story = await req.json()
    await dbSaveStory(story)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    await dbDeleteStory(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
