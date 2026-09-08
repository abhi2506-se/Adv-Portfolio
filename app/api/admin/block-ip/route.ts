import { NextRequest, NextResponse } from 'next/server'

// Block IP feature has been removed.
// These endpoints are kept so no 404s occur but do nothing.

export async function GET(req: NextRequest) {
  return NextResponse.json({ blocked: [] })
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ success: false, message: 'Block IP feature is disabled.' })
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ success: false, message: 'Block IP feature is disabled.' })
}
