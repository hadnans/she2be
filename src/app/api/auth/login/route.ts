import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/session'
import { verifyPassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body.email || '').toLowerCase().trim()
  const password = String(body.password || '')

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

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
  })
}
