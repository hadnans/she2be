import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/orders/[id]/track
 * Returns the live delivery tracking info for an order.
 * Customer-facing: only the order's owner (or admin) can view this.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      deliveryTracking: {
        include: { driver: true, warehouse: true },
      },
    },
  })
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // Allow owner or admin
  if (order.userId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ order, tracking: order.deliveryTracking })
}
