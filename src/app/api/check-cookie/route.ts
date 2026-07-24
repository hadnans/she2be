import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const store = await cookies()
  const testCookie = store.get('test-cookie')
  return NextResponse.json({
    hasTestCookie: !!testCookie,
    value: testCookie?.value || null,
  })
}
