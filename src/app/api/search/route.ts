import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/search?q=<query>&limit=10
 * Returns combined results from products, categories, and brands.
 * Used by the global search command palette (Cmd+K).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const limit = Math.min(20, parseInt(searchParams.get('limit') || '10', 10))

  if (!q || q.length < 1) {
    return NextResponse.json({ products: [], categories: [], brands: [] })
  }

  // Search products (by name or description)
  const products = await db.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
        { sku: { contains: q } },
      ],
    },
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      pricePiasters: true,
      unit: true,
      imageUrl: true,
      categoryId: true,
      category: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
  })

  // Search categories
  const categories = await db.category.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: 5,
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
    },
  })

  // Search brands
  const brands = await db.brand.findMany({
    where: { name: { contains: q } },
    take: 5,
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })

  return NextResponse.json({
    products: products.map((p) => ({
      type: 'product' as const,
      id: p.id,
      name: p.name,
      slug: p.slug,
      href: `/?search=${encodeURIComponent(p.name)}`,
      pricePiasters: p.pricePiasters,
      imageUrl: p.imageUrl,
      category: p.category?.name,
    })),
    categories: categories.map((c) => ({
      type: 'category' as const,
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      href: `/?category=${c.slug}`,
    })),
    brands: brands.map((b) => ({
      type: 'brand' as const,
      id: b.id,
      name: b.name,
      slug: b.slug,
      href: `/?search=${encodeURIComponent(b.name)}`,
    })),
  })
}
