import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { listConfiguredAdapters, getAdapter } from '@/lib/payments'

/**
 * GET /api/payments/providers
 * Returns the list of payment providers available on this checkout.
 * Frontend uses this to render payment buttons.
 */
export async function GET() {
  const allAdapters = listConfiguredAdapters()
  return NextResponse.json({
    providers: allAdapters.map((a) => ({
      id: a.id,
      displayName: a.displayName,
    })),
  })
}

/**
 * POST /api/payments/create
 * Body: { orderId, provider }
 * Creates a payment intent with the chosen provider and returns
 * the redirect URL / client secret for the frontend.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { orderId, provider } = body

  if (!orderId || !provider) {
    return NextResponse.json(
      { error: 'orderId and provider required' },
      { status: 400 }
    )
  }

  // Load the order
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.paymentStatus === 'paid') {
    return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
  }

  // Get adapter
  let adapter
  try {
    adapter = getAdapter(provider)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
  if (!adapter.isConfigured()) {
    return NextResponse.json(
      { error: `${adapter.displayName} is not configured` },
      { status: 503 }
    )
  }

  // Build context
  const origin = req.headers.get('origin') || 'http://localhost:3000'
  const ctx = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountPiasters: order.totalPiasters,
    currency: 'EGP',
    customer: {
      email: user.email,
      name: order.deliveryName,
      phone: order.deliveryPhone,
    },
    successUrl: `${origin}/orders/${order.id}?payment=success&provider=${provider}`,
    cancelUrl: `${origin}/orders/${order.id}?payment=cancelled&provider=${provider}`,
    webhookUrl: `${origin}/api/payments/webhook?provider=${provider}`,
  }

  // Create intent
  try {
    const intent = await adapter.createIntent(ctx)

    // Persist a Payment record
    await db.payment.create({
      data: {
        orderId: order.id,
        provider,
        status: 'pending',
        amountPiasters: order.totalPiasters,
        currency: 'EGP',
        providerSessionId: intent.providerSessionId,
        clientSecret: intent.clientSecret,
        redirectUrl: intent.redirectUrl,
        metadata: JSON.stringify(intent.raw || {}),
      },
    })

    return NextResponse.json({
      provider,
      intentId: intent.id,
      redirectUrl: intent.redirectUrl,
      clientSecret: intent.clientSecret,
    })
  } catch (e: any) {
    console.error('Payment intent creation failed:', e)
    return NextResponse.json(
      { error: e.message || 'Payment provider error' },
      { status: 500 }
    )
  }
}
