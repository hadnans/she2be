import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug, deletedAt: null },
    include: {
      category: true,
      brand: true,
      reviews: {
        where: { isActive: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })
  if (!product || !product.isActive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(product)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { slug } = await params
  const body = await req.json()

  const existing = await db.product.findUnique({ where: { slug } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // If slug is changing, verify uniqueness
  if (body.slug && body.slug !== slug) {
    const dupe = await db.product.findUnique({ where: { slug: body.slug } })
    if (dupe) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
    }
  }

  const allowed: Record<string, any> = {}
  const fields = [
    'name', 'slug', 'description', 'longDescription', 'pricePiasters',
    'compareAtPricePiasters', 'costPiasters', 'unit', 'sku', 'barcode',
    'stock', 'lowStockThreshold', 'isActive', 'isFeatured', 'isOrganic',
    'isVegan', 'categoryId', 'brandId', 'imageUrl',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) {
      allowed[f] = body[f] === null ? null : (typeof existing[f as keyof typeof existing] === 'number' ? Number(body[f]) : body[f])
    }
  }
  if (body.galleryUrls !== undefined) {
    allowed.galleryUrls = JSON.stringify(body.galleryUrls)
  }

  const updated = await db.product.update({
    where: { slug },
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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { slug } = await params
  const existing = await db.product.findUnique({ where: { slug } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // Soft delete
  const updated = await db.product.update({
    where: { slug },
    data: { deletedAt: new Date(), isActive: false },
  })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'DELETE',
      entity: 'product',
      entityId: updated.id,
      metadata: JSON.stringify({ name: existing.name }),
    },
  })

  return NextResponse.json({ ok: true })
}
