import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/coupons/validate
 * Body: { code, subtotalPiasters }
 * Returns the coupon + computed discount if valid, else 400.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const code = String(body.code || '').toUpperCase().trim()
  const subtotalPiasters = Number(body.subtotalPiasters || 0)

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }
  const coupon = await db.coupon.findUnique({ where: { code } })
  if (!coupon || !coupon.isActive) {
    return NextResponse.json({ error: 'Invalid coupon' }, { status: 400 })
  }
  const now = new Date()
  if (coupon.startsAt && coupon.startsAt > now) {
    return NextResponse.json({ error: 'Coupon not yet active' }, { status: 400 })
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return NextResponse.json({ error: 'Coupon expired' }, { status: 400 })
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
  }
  if (coupon.minOrderPiasters && subtotalPiasters < coupon.minOrderPiasters) {
    return NextResponse.json(
      { error: `Requires minimum order of ${(coupon.minOrderPiasters / 100).toFixed(2)} EGP` },
      { status: 400 }
    )
  }

  let discountPiasters = 0
  if (coupon.discountType === 'percent') {
    discountPiasters = Math.floor((subtotalPiasters * coupon.discountValue) / 100)
    if (coupon.maxDiscountPiasters) {
      discountPiasters = Math.min(discountPiasters, coupon.maxDiscountPiasters)
    }
  } else {
    discountPiasters = coupon.discountValue
  }

  return NextResponse.json({
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountPiasters,
  })
}
