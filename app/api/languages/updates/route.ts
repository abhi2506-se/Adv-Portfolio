import { NextResponse } from 'next/server'

// Default learning updates
const defaultUpdates = [
  {
    id: '1',
    language: 'German',
    date: new Date().toISOString().split('T')[0],
    content: 'Learned 10 new German vocabulary words related to daily activities',
    category: 'Vocabulary'
  },
  {
    id: '2',
    language: 'German',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    content: 'Completed grammar lesson on past tense (Präteritum)',
    category: 'Grammar'
  },
  {
    id: '3',
    language: 'German',
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    content: 'Practiced listening skills with German podcasts',
    category: 'Listening'
  }
]

export async function GET() {
  try {
    // In production, this should fetch from your database
    // const updates = await db.languageUpdates.findMany()
    // return NextResponse.json(updates)
    
    return NextResponse.json(defaultUpdates)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { language, content, category } = body

    // Validate input
    if (!language || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // In production, save to database
    // const update = await db.languageUpdates.create({
    //   data: {
    //     language,
    //     content,
    //     category: category || 'General',
    //     date: new Date().toISOString().split('T')[0]
    //   }
    // })

    return NextResponse.json({
      success: true,
      message: 'Update added successfully',
      data: {
        id: Date.now().toString(),
        language,
        content,
        category: category || 'General',
        date: new Date().toISOString().split('T')[0]
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add update' },
      { status: 500 }
    )
  }
}
