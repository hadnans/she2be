import { NextResponse } from 'next/server'

export async function GET() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('test-cookie', 'test-value', {
    httpOnly: true,
    path: '/',
    maxAge: 60,
  })
  return res
}
