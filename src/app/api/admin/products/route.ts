import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

/**
 * GET /api/admin/products
 * Admin product list — includes inactive + soft-deleted (for management).
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const includeDeleted = searchParams.get('includeDeleted') === 'true'

  const where: any = {}
  if (!includeDeleted) where.deletedAt = null
  if (q) where.name = { contains: q }

  const items = await db.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { category: true, brand: true },
    take: 200,
  })
  return NextResponse.json({ items })
}
