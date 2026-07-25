import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getCurrentUser } from '@/lib/session'

export async function GET() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { products: { where: { isActive: true, deletedAt: null } } } },
    },
  })
  return NextResponse.json({ items: categories })
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  if (!body.name || !body.slug) {
    return NextResponse.json({ error: 'name and slug required' }, { status: 400 })
  }
  const dupe = await db.category.findUnique({ where: { slug: body.slug } })
  if (dupe) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }

  const cat = await db.category.create({
    data: {
      name: body.name,
      slug: body.slug,
      description: body.description || null,
      icon: body.icon || null,
      imageUrl: body.imageUrl || null,
      parentId: body.parentId || null,
      sortOrder: Number(body.sortOrder ?? 0),
      isActive: body.isActive ?? true,
    },
  })

  const user = await getCurrentUser()
  await db.auditLog.create({
    data: {
      actorEmail: user?.email || 'unknown',
      action: 'CREATE',
      entity: 'category',
      entityId: cat.id,
      metadata: JSON.stringify({ name: cat.name }),
    },
  })

  return NextResponse.json(cat, { status: 201 })
}
