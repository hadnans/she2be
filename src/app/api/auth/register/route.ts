import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/session'
import { hashPassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body.email || '').toLowerCase().trim()
  const password = String(body.password || '')
  const name = String(body.name || '').trim()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const user = await db.user.create({
    data: {
      email,
      name: name || null,
      passwordHash: hashPassword(password),
      role: 'customer',
    },
  })

  await setSessionCookie({
    userId: user.id,
    role: user.role,
    email: user.email,
  })

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }, { status: 201 })
}
