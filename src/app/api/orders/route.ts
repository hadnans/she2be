import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/orders
 * Body: {
 *   deliveryName, deliveryPhone, deliveryAddress, deliveryCity,
 *   deliveryArea?, deliveryNotes?, couponCode?,
 *   deliveryFeePiasters?
 * }
 *
 * Creates an order from the user's current cart, clears the cart,
 * decrements stock, and applies coupon if valid.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to place an order' }, { status: 401 })
  }
  const body = await req.json()

  // Validate delivery fields
  const required = ['deliveryName', 'deliveryPhone', 'deliveryAddress', 'deliveryCity']
  for (const f of required) {
    if (!body[f]) {
      return NextResponse.json({ error: `Missing ${f}` }, { status: 400 })
    }
  }

  // Load cart
  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: true } } },
  })
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })
  }

  // Validate stock + compute subtotal
  const subtotalPiasters = cart.items.reduce(
    (sum, it) => sum + it.product.pricePiasters * it.quantity,
    0
  )

  // Apply coupon
  let discountPiasters = 0
  let couponId: string | null = null
  if (body.couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: body.couponCode } })
    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: 'Invalid coupon' }, { status: 400 })
    }
    if (coupon.startsAt && coupon.startsAt > new Date()) {
      return NextResponse.json({ error: 'Coupon not yet active' }, { status: 400 })
    }
    if (coupon.endsAt && coupon.endsAt < new Date()) {
      return NextResponse.json({ error: 'Coupon expired' }, { status: 400 })
    }
    if (coupon.minOrderPiasters && subtotalPiasters < coupon.minOrderPiasters) {
      return NextResponse.json(
        { error: `Coupon requires minimum order of ${coupon.minOrderPiasters / 100} EGP` },
        { status: 400 }
      )
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
    }
    if (coupon.discountType === 'percent') {
      discountPiasters = Math.floor((subtotalPiasters * coupon.discountValue) / 100)
      if (coupon.maxDiscountPiasters) {
        discountPiasters = Math.min(discountPiasters, coupon.maxDiscountPiasters)
      }
    } else {
      discountPiasters = coupon.discountValue
    }
    couponId = coupon.id
  }

  const deliveryFeePiasters = Number(body.deliveryFeePiasters ?? 3500) // 35 EGP default
  const totalPiasters = subtotalPiasters - discountPiasters + deliveryFeePiasters

  if (totalPiasters < 0) {
    return NextResponse.json({ error: 'Invalid total' }, { status: 400 })
  }

  // Generate order number
  const orderNumber = `SHB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  // Create order in a transaction
  const order = await db.$transaction(async (tx) => {
    // Decrement stock for each item
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.name}`)
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: 'pending',
        paymentStatus: 'unpaid',
        subtotalPiasters,
        deliveryFeePiasters,
        discountPiasters,
        totalPiasters,
        deliveryName: body.deliveryName,
        deliveryPhone: body.deliveryPhone,
        deliveryAddress: body.deliveryAddress,
        deliveryCity: body.deliveryCity,
        deliveryArea: body.deliveryArea || null,
        deliveryNotes: body.deliveryNotes || null,
        couponCode: body.couponCode || null,
        items: {
          create: cart.items.map((it) => ({
            productId: it.productId,
            productName: it.product.name,
            productImageUrl: it.product.imageUrl,
            unit: it.product.unit,
            pricePiasters: it.product.pricePiasters,
            quantity: it.quantity,
            lineTotalPiasters: it.product.pricePiasters * it.quantity,
          })),
        },
      },
      include: { items: true },
    })

    // Increment coupon usage
    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

    return created
  })

  return NextResponse.json(order, { status: 201 })
}

/**
 * GET /api/orders
 * Returns the current user's order history.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ items: [] })
  }
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: 'desc' },
    include: { items: true },
    take: 50,
  })
  return NextResponse.json({ items: orders })
}
