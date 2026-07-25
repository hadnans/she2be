import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

/**
 * GET /api/admin/stats
 * Dashboard summary numbers.
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [
    totalProducts,
    activeProducts,
    lowStockCount,
    totalCategories,
    totalOrders,
    pendingOrders,
    totalCustomers,
    revenueAggregate,
    recentOrders,
  ] = await Promise.all([
    db.product.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null, isActive: true } }),
    db.product.count({
      where: {
        deletedAt: null,
        isActive: true,
        stock: { lte: db.product.fields.lowStockThreshold },
      },
    }),
    db.category.count({ where: { isActive: true } }),
    db.order.count(),
    db.order.count({ where: { status: 'pending' } }),
    db.user.count({ where: { role: 'customer' } }),
    db.order.aggregate({ _sum: { totalPiasters: true } }),
    db.order.findMany({
      take: 8,
      orderBy: { placedAt: 'desc' },
      include: { items: true },
    }),
  ])

  return NextResponse.json({
    totalProducts,
    activeProducts,
    lowStockCount,
    totalCategories,
    totalOrders,
    pendingOrders,
    totalCustomers,
    revenuePiasters: revenueAggregate._sum.totalPiasters || 0,
    recentOrders,
  })
}
