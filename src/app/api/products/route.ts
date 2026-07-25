import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/session'

/**
 * GET /api/products
 *   ?q=              full-text search on name (SQLite LIKE)
 *   ?category=       category slug
 *   ?featured=true    only featured products
 *   ?organic=true     only organic
 *   ?sort=            name | price-asc | price-desc | newest
 *   ?page=            1-indexed
 *   ?pageSize=        default 24
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const categorySlug = searchParams.get('category')?.trim()
  const featured = searchParams.get('featured') === 'true'
  const organic = searchParams.get('organic') === 'true'
  const vegan = searchParams.get('vegan') === 'true'
  const sort = searchParams.get('sort') || 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(60, Math.max(1, parseInt(searchParams.get('pageSize') || '24', 10)))

  const where: any = {
    isActive: true,
    deletedAt: null,
  }
  if (q) where.name = { contains: q }
  if (featured) where.isFeatured = true
  if (organic) where.isOrganic = true
  if (vegan) where.isVegan = true
  if (categorySlug) {
    const cat = await db.category.findUnique({ where: { slug: categorySlug } })
    if (cat) where.categoryId = cat.id
  }

  let orderBy: any = { createdAt: 'desc' }
  if (sort === 'name') orderBy = { name: 'asc' }
  else if (sort === 'price-asc') orderBy = { pricePiasters: 'asc' }
  else if (sort === 'price-desc') orderBy = { pricePiasters: 'desc' }

  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true, brand: true },
    }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  })
}

/**
 * POST /api/products  (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()

  if (!body.name || !body.slug || !body.categoryId || body.pricePiasters == null) {
    return NextResponse.json(
      { error: 'Missing required fields: name, slug, categoryId, pricePiasters' },
      { status: 400 }
    )
  }
  if (body.pricePiasters < 0) {
    return NextResponse.json({ error: 'Price must be >= 0' }, { status: 400 })
  }

  const existing = await db.product.findUnique({ where: { slug: body.slug } })
  if (existing) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }

  const product = await db.product.create({
    data: {
      name: body.name,
      slug: body.slug,
      description: body.description || null,
      longDescription: body.longDescription || null,
      pricePiasters: Number(body.pricePiasters),
      compareAtPricePiasters: body.compareAtPricePiasters ? Number(body.compareAtPricePiasters) : null,
      costPiasters: body.costPiasters ? Number(body.costPiasters) : null,
      unit: body.unit || null,
      sku: body.sku || null,
      barcode: body.barcode || null,
      stock: Number(body.stock ?? 0),
      lowStockThreshold: Number(body.lowStockThreshold ?? 5),
      isActive: body.isActive ?? true,
      isFeatured: body.isFeatured ?? false,
      isOrganic: body.isOrganic ?? false,
      isVegan: body.isVegan ?? false,
      categoryId: body.categoryId,
      brandId: body.brandId || null,
      imageUrl: body.imageUrl || null,
      galleryUrls: body.galleryUrls ? JSON.stringify(body.galleryUrls) : '[]',
    },
    include: { category: true, brand: true },
  })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'CREATE',
      entity: 'product',
      entityId: product.id,
      metadata: JSON.stringify({ name: product.name, slug: product.slug }),
    },
  })

  return NextResponse.json(product, { status: 201 })
}
