import { NextResponse } from 'next/server'

// Default exams data
const defaultExams = [
  {
    id: '1',
    language: 'English',
    level: 'C1',
    status: 'cleared',
    score: 185,
    totalScore: 190,
    clearedDate: '2023-06-15',
    certificate: 'https://via.placeholder.com/800x600?text=English+Certificate'
  },
  {
    id: '2',
    language: 'German',
    level: 'B1',
    status: 'cleared',
    score: 72,
    totalScore: 100,
    clearedDate: '2024-02-20',
    certificate: 'https://via.placeholder.com/800x600?text=German+Certificate'
  },
  {
    id: '3',
    language: 'German',
    level: 'B2',
    status: 'pending',
    score: null,
    totalScore: null,
    clearedDate: null,
    certificate: null
  }
]

export async function GET() {
  try {
    // In production, this should fetch from your database
    // const exams = await db.languageExams.findMany()
    // return NextResponse.json(exams)
    
    return NextResponse.json(defaultExams)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { language, level, status, score, totalScore, clearedDate, certificate } = body

    // Validate input
    if (!language || !level) {
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
    // const exam = await db.languageExams.create({
    //   data: {
    //     language,
    //     level,
    //     status: status || 'pending',
    //     score,
    //     totalScore,
    //     clearedDate,
    //     certificate
    //   }
    // })

    return NextResponse.json({
      success: true,
      message: 'Exam record added successfully',
      data: {
        id: Date.now().toString(),
        language,
        level,
        status: status || 'pending',
        score,
        totalScore,
        clearedDate,
        certificate
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add exam' },
      { status: 500 }
    )
  }
}

// Update certificate
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { examId, certificate } = body

    // Validate input
    if (!examId || !certificate) {
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

    // In production, update in database
    // await db.languageExams.update({
    //   where: { id: examId },
    //   data: { certificate }
    // })

    return NextResponse.json({
      success: true,
      message: 'Certificate updated successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update certificate' },
      { status: 500 }
    )
  }
}
