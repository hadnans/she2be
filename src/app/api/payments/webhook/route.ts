import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdapter } from '@/lib/payments'

/**
 * POST /api/payments/webhook?provider=<provider>
 * Generic webhook receiver. Each adapter handles signature verification
 * and event parsing.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider')

  if (!provider) {
    return NextResponse.json({ error: 'provider query param required' }, { status: 400 })
  }

  let adapter
  try {
    adapter = getAdapter(provider)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  if (!adapter.handleWebhook) {
    return NextResponse.json({ error: 'No webhook handler' }, { status: 404 })
  }

  const payload = Buffer.from(await req.arrayBuffer())
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k] = v })

  try {
    const event = await adapter.handleWebhook(payload, headers)
    // Process common event types
    const anyEvent = event as any
    if (anyEvent?.metadata?.order_id || anyEvent?.client_reference_id) {
      const orderId = anyEvent.metadata?.order_id || anyEvent.client_reference_id
      const payment = await db.payment.findFirst({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      })
      if (payment) {
        const isPaid = anyEvent.type?.includes('succeeded') ||
                       anyEvent.type?.includes('paid') ||
                       anyEvent.status === 'PAID' ||
                       anyEvent.status === 'SUCCESS'
        if (isPaid) {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: 'completed',
              transactionId: anyEvent.id || anyEvent.transactionId || payment.transactionId,
            },
          })
          await db.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'paid', paidAt: new Date() },
          })
        }
      }
    }
    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('Webhook handler failed:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
