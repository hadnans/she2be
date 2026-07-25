import { NextRequest, NextResponse } from 'next/server'
import { calculateRoute, haversineMeters } from '@/lib/maps'

/**
 * POST /api/maps/distance
 * Body: { from: {lat, lng}, to: {lat, lng} }
 * Returns driving distance + ETA, falls back to haversine straight-line.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { from, to } = body
  if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) {
    return NextResponse.json(
      { error: 'from and to coordinates required' },
      { status: 400 }
    )
  }
  try {
    const route = await calculateRoute(from, to)
    return NextResponse.json(route)
  } catch (e: any) {
    // Fallback: haversine + assume 40 km/h avg speed
    const distanceMeters = haversineMeters(from, to)
    const durationMinutes = Math.round(distanceMeters / 1000 / 40 * 60)
    return NextResponse.json({
      distanceMeters,
      durationMinutes,
      fallback: true,
      error: e.message,
    })
  }
}
