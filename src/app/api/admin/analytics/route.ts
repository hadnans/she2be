import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

/**
 * GET /api/admin/analytics
 * Returns aggregate analytics for the admin dashboard.
 *
 * Query params:
 *   ?days=30 — last N days of revenue/order data
 */
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10)))

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Revenue + order count over time (per day)
  const orders = await db.order.findMany({
    where: { placedAt: { gte: since } },
    select: {
      placedAt: true,
      totalPiasters: true,
      status: true,
      paymentStatus: true,
    },
    orderBy: { placedAt: 'asc' },
  })

  // Group by day
  const dailyMap = new Map<string, { date: string; revenue: number; orders: number }>()
  for (const o of orders) {
    const d = o.placedAt.toISOString().split('T')[0]
    const entry = dailyMap.get(d) || { date: d, revenue: 0, orders: 0 }
    entry.revenue += o.totalPiasters
    entry.orders += 1
    dailyMap.set(d, entry)
  }
  const dailySeries = Array.from(dailyMap.values())

  // Status distribution
  const statusCounts = await db.order.groupBy({
    by: ['status'],
    _count: { _all: true },
    where: { placedAt: { gte: since } },
  })

  // Top products by revenue (last 30 days)
  const orderItems = await db.orderItem.findMany({
    where: { order: { placedAt: { gte: since } } },
    select: { productName: true, quantity: true, lineTotalPiasters: true },
    take: 5000,
  })
  const productAgg = new Map<string, { name: string; revenue: number; quantity: number }>()
  for (const it of orderItems) {
    const entry = productAgg.get(it.productName) || { name: it.productName, revenue: 0, quantity: 0 }
    entry.revenue += it.lineTotalPiasters
    entry.quantity += it.quantity
    productAgg.set(it.productName, entry)
  }
  const topProducts = Array.from(productAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Category distribution
  const products = await db.product.findMany({
    where: { deletedAt: null },
    select: { categoryId: true, category: { select: { name: true } } },
  })
  const categoryAgg = new Map<string, { name: string; count: number }>()
  for (const p of products) {
    const name = p.category?.name || 'Uncategorized'
    const entry = categoryAgg.get(name) || { name, count: 0 }
    entry.count += 1
    categoryAgg.set(name, entry)
  }
  const categoryDistribution = Array.from(categoryAgg.values()).sort((a, b) => b.count - a.count)

  // Payment methods used
  let paymentMethods: any[] = []
  try {
    paymentMethods = await db.payment.groupBy({
      by: ['provider'],
      _count: { _all: true },
      _sum: { amountPiasters: true },
      where: { status: 'completed', createdAt: { gte: since } },
    })
  } catch {
    // Payment table might be empty — that's fine
  }

  return NextResponse.json({
    days,
    dailySeries,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
    topProducts,
    categoryDistribution,
    paymentMethods: paymentMethods.map((p) => ({
      provider: p.provider,
      count: p._count._all,
      revenuePiasters: p._sum.amountPiasters || 0,
    })),
    summary: {
      totalRevenue: dailySeries.reduce((s, d) => s + d.revenue, 0),
      totalOrders: orders.length,
      avgOrderValue: orders.length > 0
        ? Math.round(orders.reduce((s, o) => s + o.totalPiasters, 0) / orders.length)
        : 0,
    },
  })
}
