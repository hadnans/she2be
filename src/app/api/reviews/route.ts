import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/reviews
 * Body: { productId, rating, title?, body? }
 * Creates or updates the current user's review for a product.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to leave a review' }, { status: 401 })
  }
  const body = await req.json()
  const productId = body.productId
  const rating = Number(body.rating)
  const title = body.title?.toString().trim() || null
  const bodyText = body.body?.toString().trim() || null

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be an integer 1-5' }, { status: 400 })
  }

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Upsert the review (one per user per product)
  const review = await db.review.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    update: { rating, title, body: bodyText, isActive: true },
    create: { userId: user.id, productId, rating, title, body: bodyText },
  })

  // Recompute product rating cache
  const agg = await db.review.aggregate({
    where: { productId, isActive: true },
    _avg: { rating: true },
    _count: { rating: true },
  })
  await db.product.update({
    where: { id: productId },
    data: {
      ratingAvg: agg._avg.rating || 0,
      ratingCount: agg._count.rating,
    },
  })

  return NextResponse.json(review, { status: 201 })
}

/**
 * GET /api/reviews?productId=...
 * Returns all active reviews for a product.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  if (!productId) {
    return NextResponse.json({ items: [] })
  }
  const reviews = await db.review.findMany({
    where: { productId, isActive: true },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ items: reviews })
}
