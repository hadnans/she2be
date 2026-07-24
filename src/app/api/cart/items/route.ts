import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/cart/items
 * Body: { productId, quantity }
 * Set item quantity to exactly `quantity` (creates if missing).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const productId = body.productId
  const quantity = Math.max(0, Number(body.quantity ?? 1))

  let cart = await db.cart.findUnique({ where: { userId: user.id } })
  if (!cart) {
    cart = await db.cart.create({ data: { userId: user.id } })
  }

  if (quantity === 0) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } })
    return NextResponse.json({ ok: true })
  }

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  if (quantity > product.stock) {
    return NextResponse.json(
      { error: `Only ${product.stock} in stock` },
      { status: 409 }
    )
  }

  await db.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity },
    create: { cartId: cart.id, productId, quantity },
  })

  return NextResponse.json({ ok: true })
}
