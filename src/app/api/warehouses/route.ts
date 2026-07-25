import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getCurrentUser } from '@/lib/session'
import { geocode } from '@/lib/maps'

/**
 * GET /api/warehouses — public: list active warehouses.
 * POST /api/warehouses — admin: create a warehouse.
 */
export async function GET() {
  const warehouses = await db.warehouse.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { drivers: { where: { isAvailable: true, isActive: true } } } },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json({ items: warehouses })
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()

  if (!body.name || !body.address || !body.city) {
    return NextResponse.json({ error: 'name, address, city required' }, { status: 400 })
  }

  // Geocode the address if lat/lng not provided
  let lat = body.latitude ? Number(body.latitude) : null
  let lng = body.longitude ? Number(body.longitude) : null
  if (lat == null || lng == null) {
    try {
      const results = await geocode(`${body.address}, ${body.city}`)
      if (results.length > 0) {
        lat = results[0].lat
        lng = results[0].lng
      } else {
        return NextResponse.json(
          { error: 'Could not geocode this address. Please provide latitude/longitude manually.' },
          { status: 400 }
        )
      }
    } catch (e: any) {
      return NextResponse.json(
        { error: `Geocoding failed: ${e.message}. Please provide latitude/longitude manually.` },
        { status: 400 }
      )
    }
  }

  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  // If isDefault, unset other defaults
  if (body.isDefault) {
    await db.warehouse.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  const warehouse = await db.warehouse.create({
    data: {
      name: body.name,
      slug,
      address: body.address,
      city: body.city,
      area: body.area || null,
      latitude: lat!,
      longitude: lng!,
      phone: body.phone || null,
      isActive: body.isActive ?? true,
      isDefault: body.isDefault ?? false,
    },
  })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'CREATE',
      entity: 'warehouse',
      entityId: warehouse.id,
      metadata: JSON.stringify({ name: warehouse.name }),
    },
  })

  return NextResponse.json(warehouse, { status: 201 })
}
