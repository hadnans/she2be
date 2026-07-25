/**
 * Stripe payment adapter.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY=sk_test_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 *
 * In production, you'd `import Stripe from 'stripe'` and use the SDK.
 * For dev/preview without the SDK installed, we fall back to direct
 * REST calls with fetch.
 */
import { PaymentAdapter, PaymentContext, PaymentIntent, PaymentVerification } from './types'

const STRIPE_API = 'https://api.stripe.com/v1'

export const stripeAdapter: PaymentAdapter = {
  id: 'stripe',
  displayName: 'Credit / Debit Card (Stripe)',
  isConfigured: () => !!process.env.STRIPE_SECRET_KEY,

  async createIntent(ctx: PaymentContext): Promise<PaymentIntent> {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing)')

    // Create a Checkout Session (redirect-based flow, simplest for v1).
    // The Stripe SDK would be: `stripe.checkout.sessions.create(...)`.
    const body = new URLSearchParams({
      mode: 'payment',
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': ctx.currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': `Order ${ctx.orderNumber}`,
      'line_items[0][price_data][unit_amount]': String(ctx.amountPiasters),
      'line_items[0][quantity]': '1',
      'client_reference_id': ctx.orderId,
      'customer_email': ctx.customer.email,
      'success_url': ctx.successUrl,
      'cancel_url': ctx.cancelUrl,
      'metadata[order_id]': ctx.orderId,
      'metadata[order_number]': ctx.orderNumber,
    })

    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Stripe createIntent failed: ${err}`)
    }
    const data = await res.json()
    return {
      id: data.id,
      providerSessionId: data.id,
      redirectUrl: data.url,
      clientSecret: data.payment_intent?.client_secret,
      raw: data,
    }
  },

  async verifyPayment(intent, params): Promise<PaymentVerification> {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return { ok: false, error: 'Stripe not configured' }

    const sessionId = params.session_id || intent.providerSessionId
    const res = await fetch(`${STRIPE_API}/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      return { ok: false, error: `Stripe verify failed: ${res.status}` }
    }
    const data = await res.json()
    return {
      ok: data.payment_status === 'paid',
      transactionId: data.payment_intent,
      raw: data,
    }
  },

  async handleWebhook(payload, headers) {
    // Verify signature using STRIPE_WEBHOOK_SECRET.
    // In production: `stripe.webhooks.constructEvent(payload, sig, secret)`
    // For now, we accept the event and parse it.
    const event = JSON.parse(payload.toString('utf8'))
    return event
  },
}
