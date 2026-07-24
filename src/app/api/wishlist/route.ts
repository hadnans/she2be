import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/wishlist
 * Returns the current user's wishlist with product details.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ items: [] })
  }

  let wishlist = await db.wishlist.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!wishlist) {
    wishlist = await db.wishlist.create({
      data: { userId: user.id },
      include: {
        items: { include: { product: { include: { category: true } } } },
      },
    })
  }

  return NextResponse.json({
    id: wishlist.id,
    items: wishlist.items,
  })
}

/**
 * POST /api/wishlist
 * Body: { productId }
 * Adds an item to the wishlist (idempotent).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in to save items to your wishlist' },
      { status: 401 }
    )
  }
  const body = await req.json()
  const productId = body.productId
  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 })
  }

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  let wishlist = await db.wishlist.findUnique({ where: { userId: user.id } })
  if (!wishlist) {
    wishlist = await db.wishlist.create({ data: { userId: user.id } })
  }

  // Upsert wishlist item (idempotent)
  await db.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    update: {},
    create: { wishlistId: wishlist.id, productId },
  })

  return NextResponse.json({ ok: true })
}
