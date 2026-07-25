import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getCurrentUser } from '@/lib/session'

const VALID_STATUSES = [
  'pending',
  'paid',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
]

/**
 * PATCH /api/admin/orders/[id]
 * Body: { status?, paymentStatus? }
 * Update order status (admin only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()

  const existing = await db.order.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const update: any = {}
  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
    if (body.status === 'delivered' && !existing.deliveredAt) {
      update.deliveredAt = new Date()
    }
    if (body.status === 'cancelled' && !existing.cancelledAt) {
      update.cancelledAt = new Date()
    }
  }
  if (body.paymentStatus) {
    if (!['unpaid', 'paid', 'refunded'].includes(body.paymentStatus)) {
      return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
    }
    update.paymentStatus = body.paymentStatus
    if (body.paymentStatus === 'paid' && !existing.paidAt) {
      update.paidAt = new Date()
    }
  }

  const updated = await db.order.update({
    where: { id },
    data: update,
    include: { items: true, user: { select: { id: true, name: true, email: true } } },
  })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'UPDATE_ORDER',
      entity: 'order',
      entityId: id,
      metadata: JSON.stringify(update),
    },
  })

  return NextResponse.json(updated)
}
