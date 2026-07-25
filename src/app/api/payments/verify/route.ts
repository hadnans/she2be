import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getAdapter } from '@/lib/payments'

/**
 * POST /api/payments/verify
 * Body: { orderId, provider, ...providerParams }
 * Verifies a payment after the customer returns from the provider,
 * or after an Apple Pay session completes.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { orderId, provider, ...params } = body

  if (!orderId || !provider) {
    return NextResponse.json(
      { error: 'orderId and provider required' },
      { status: 400 }
    )
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  })
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const payment = order.payments
    .filter((p) => p.provider === provider && p.status === 'pending')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

  if (!payment) {
    return NextResponse.json({ error: 'No pending payment found' }, { status: 404 })
  }

  let adapter
  try {
    adapter = getAdapter(provider)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const intent = {
    id: payment.id,
    providerSessionId: payment.providerSessionId || '',
    clientSecret: payment.clientSecret || undefined,
  }

  try {
    const result = await adapter.verifyPayment(intent, params)

    if (result.ok) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          transactionId: result.transactionId,
          metadata: JSON.stringify({ ...JSON.parse(payment.metadata), verify: result.raw }),
        },
      })
      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          status: order.status === 'pending' ? 'paid' : order.status,
          paidAt: new Date(),
        },
      })
      return NextResponse.json({ ok: true, transactionId: result.transactionId })
    } else {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          errorMessage: result.error || 'Verification failed',
        },
      })
      return NextResponse.json(
        { ok: false, error: result.error || 'Verification failed' },
        { status: 400 }
      )
    }
  } catch (e: any) {
    console.error('Payment verify failed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
