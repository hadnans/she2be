import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getCurrentUser } from '@/lib/session'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const existing = await db.warehouse.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If isDefault, unset other defaults
  if (body.isDefault) {
    await db.warehouse.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const allowed: Record<string, any> = {}
  for (const f of ['name', 'address', 'city', 'area', 'phone', 'isActive', 'isDefault']) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }
  if (body.latitude != null) allowed.latitude = Number(body.latitude)
  if (body.longitude != null) allowed.longitude = Number(body.longitude)

  const updated = await db.warehouse.update({ where: { id }, data: allowed })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'UPDATE',
      entity: 'warehouse',
      entityId: id,
      metadata: JSON.stringify({ changedFields: Object.keys(allowed) }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const existing = await db.warehouse.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft-delete by setting isActive=false (we keep the row for historical orders)
  await db.warehouse.update({
    where: { id },
    data: { isActive: false, isDefault: false },
  })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'DELETE',
      entity: 'warehouse',
      entityId: id,
      metadata: JSON.stringify({ name: existing.name }),
    },
  })

  return NextResponse.json({ ok: true })
}
