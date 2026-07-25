import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getCurrentUser } from '@/lib/session'

/**
 * GET /api/admin/orders
 * List all orders (admin only). Supports ?status= filter.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const where: any = {}
  if (status) where.status = status

  const orders = await db.order.findMany({
    where,
    orderBy: { placedAt: 'desc' },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
    take: 200,
  })
  return NextResponse.json({ items: orders })
}
