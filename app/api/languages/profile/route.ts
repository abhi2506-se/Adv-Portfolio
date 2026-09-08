import { NextResponse } from 'next/server'

// Default language profiles - can be stored in database
const defaultLanguages = [
  {
    id: '1',
    name: 'English',
    code: 'en',
    proficiency: 'fluent',
    status: 'known',
    flag: '🇬🇧'
  },
  {
    id: '2',
    name: 'Hindi',
    code: 'hi',
    proficiency: 'native',
    status: 'known',
    flag: '🇮🇳'
  },
  {
    id: '3',
    name: 'Haryanvi',
    code: 'haryanvi',
    proficiency: 'native',
    status: 'known',
    flag: '🇮🇳'
  },
  {
    id: '4',
    name: 'German',
    code: 'de',
    proficiency: 'intermediate',
    status: 'learning',
    learningSince: 'January 2024',
    flag: '🇩🇪'
  }
]

export async function GET() {
  try {
    // In production, this should fetch from your database
    // const languages = await db.languages.findMany()
    // return NextResponse.json(languages)
    
    return NextResponse.json(defaultLanguages)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch languages' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // In production, save to database
    // const language = await db.languages.create({ data: body })
    
    return NextResponse.json({ 
      success: true,
      message: 'Language added successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add language' },
      { status: 500 }
    )
  }
}
