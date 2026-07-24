import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/cart
 * Returns the current user's cart with items + product details.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ items: [] })
  }

  let cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!cart) {
    cart = await db.cart.create({
      data: { userId: user.id },
      include: {
        items: { include: { product: { include: { category: true } } } },
      },
    })
  }

  const subtotalPiasters = cart.items.reduce(
    (sum, it) => sum + it.product.pricePiasters * it.quantity,
    0
  )
  const itemCount = cart.items.reduce((sum, it) => sum + it.quantity, 0)

  return NextResponse.json({
    id: cart.id,
    items: cart.items,
    subtotalPiasters,
    itemCount,
  })
}

/**
 * POST /api/cart
 * Body: { productId, quantity }
 * Adds an item (or increments quantity if it exists).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in to add items to your cart' },
      { status: 401 }
    )
  }
  const body = await req.json()
  const productId = body.productId
  const quantity = Math.max(1, Number(body.quantity ?? 1))

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product || !product.isActive) {
    return NextResponse.json({ error: 'Product not available' }, { status: 404 })
  }
  if (product.stock < quantity) {
    return NextResponse.json(
      { error: `Only ${product.stock} in stock` },
      { status: 409 }
    )
  }

  let cart = await db.cart.findUnique({ where: { userId: user.id } })
  if (!cart) {
    cart = await db.cart.create({ data: { userId: user.id } })
  }

  // Upsert cart item
  const existing = await db.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  })
  if (existing) {
    const newQty = existing.quantity + quantity
    if (newQty > product.stock) {
      return NextResponse.json(
        { error: `Only ${product.stock} in stock` },
        { status: 409 }
      )
    }
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    })
  } else {
    await db.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    })
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/cart
 * Clears all items in the cart.
 */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: true })
  }
  const cart = await db.cart.findUnique({ where: { userId: user.id } })
  if (cart) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id } })
  }
  return NextResponse.json({ ok: true })
}
