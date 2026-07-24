import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * DELETE /api/wishlist/[id]
 * Remove a wishlist item by its id.
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

  const item = await db.wishlistItem.findUnique({
    where: { id },
    include: { wishlist: true },
  })
  if (!item || item.wishlist.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await db.wishlistItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
