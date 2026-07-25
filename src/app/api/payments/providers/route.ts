import { NextResponse } from 'next/server'
import { listConfiguredAdapters } from '@/lib/payments'

export async function GET() {
  const all = listConfiguredAdapters()
  return NextResponse.json({
    providers: all.map((a) => ({
      id: a.id,
      displayName: a.displayName,
    })),
  })
}
