import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getCurrentUser } from '@/lib/session'

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
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allowed: Record<string, any> = {}
  const fields = [
    'name', 'description', 'longDescription', 'pricePiasters',
    'compareAtPricePiasters', 'costPiasters', 'unit', 'sku', 'barcode',
    'stock', 'lowStockThreshold', 'isActive', 'isFeatured', 'isOrganic',
    'isVegan', 'categoryId', 'brandId', 'imageUrl',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) {
      allowed[f] = body[f] === null ? null : (
        typeof existing[f as keyof typeof existing] === 'number'
          ? Number(body[f])
          : body[f]
      )
    }
  }

  const updated = await db.product.update({
    where: { id },
    data: allowed,
    include: { category: true, brand: true },
  })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'UPDATE',
      entity: 'product',
      entityId: updated.id,
      metadata: JSON.stringify({ changedFields: Object.keys(allowed) }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await db.product.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'DELETE',
      entity: 'product',
      entityId: id,
      metadata: JSON.stringify({ name: existing.name }),
    },
  })

  return NextResponse.json({ ok: true })
}
