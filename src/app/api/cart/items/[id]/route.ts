import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * DELETE /api/cart/items/[id]
 * Remove a specific cart item by its id.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const item = await db.cartItem.findUnique({
    where: { id },
    include: { cart: true },
  })
  if (!item || item.cart.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await db.cartItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
