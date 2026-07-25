import { NextRequest, NextResponse } from 'next/server'
import { geocode } from '@/lib/maps'

/**
 * GET /api/maps/geocode?q=<address>
 * Returns up to 5 geocoded results.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ results: [] })
  }
  try {
    const results = await geocode(q)
    return NextResponse.json({ results })
  } catch (e: any) {
    console.error('Geocode error:', e)
    return NextResponse.json(
      { error: e.message || 'Geocode failed' },
      { status: 500 }
    )
  }
}
