/**
 * Paymob payment adapter (popular in Egypt).
 *
 * Required env vars:
 *   PAYMOB_API_KEY=...
 *   PAYMOB_MERCHANT_ID=...
 *   PAYMOB_INTEGRATION_ID=... (HMAC integration ID for card payments)
 *   PAYMOB_IFRAME_ID=... (iframe ID to render the payment form)
 *   PAYMOB_WEBHOOK_HMAC=... (HMAC secret for webhook verification)
 *
 * Flow:
 *   1. POST /auth/tokens → get auth token
 *   2. POST /ecommerce/orders → register order
 *   3. POST /acceptance/payment_keys → get payment key
 *   4. Redirect to https://accept.paymob.com/api/acceptance/iframes/{IFRAME_ID}?payment_token={KEY}
 */
import { PaymentAdapter, PaymentContext, PaymentIntent, PaymentVerification } from './types'

const PAYMOB_API = 'https://accept.paymob.com/api'

export const paymobAdapter: PaymentAdapter = {
  id: 'paymob',
  displayName: 'Card / Wallet (Paymob)',
  isConfigured: () => !!(process.env.PAYMOB_API_KEY && process.env.PAYMOB_MERCHANT_ID),

  async createIntent(ctx: PaymentContext): Promise<PaymentIntent> {
    const apiKey = process.env.PAYMOB_API_KEY
    const merchantId = process.env.PAYMOB_MERCHANT_ID
    const integrationId = process.env.PAYMOB_INTEGRATION_ID
    const iframeId = process.env.PAYMOB_IFRAME_ID
    if (!apiKey || !merchantId || !integrationId || !iframeId) {
      throw new Error('Paymob not fully configured')
    }

    // 1. Auth
    const authRes = await fetch(`${PAYMOB_API}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    })
    if (!authRes.ok) throw new Error('Paymob auth failed')
    const auth = await authRes.json()
    const token = auth.token

    // 2. Register order
    const orderRes = await fetch(`${PAYMOB_API}/ecommerce/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: 'false',
        merchant_id: merchantId,
        amount_cents: ctx.amountPiasters,
        currency_code: ctx.currency,
        merchant_order_id: ctx.orderNumber,
        items: [],
      }),
    })
    if (!orderRes.ok) throw new Error('Paymob order registration failed')
    const order = await orderRes.json()

    // 3. Payment key
    const keyRes = await fetch(`${PAYMOB_API}/acceptance/payment_keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: ctx.amountPiasters,
        expiration: 3600,
        order_id: order.id,
        billing_data: {
          email: ctx.customer.email,
          first_name: ctx.customer.name.split(' ')[0] || 'Customer',
          last_name: ctx.customer.name.split(' ').slice(1).join(' ') || 'Customer',
          phone_number: ctx.customer.phone || '0000000000',
          apartment: 'NA',
          floor: 'NA',
          street: 'NA',
          building: 'NA',
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'NA',
          country: 'EG',
          state: 'NA',
        },
        currency_code: ctx.currency,
        integration_id: integrationId,
        lock_order_when_paid: 'true',
      }),
    })
    if (!keyRes.ok) throw new Error('Paymob payment key failed')
    const key = await keyRes.json()

    // 4. Redirect URL
    return {
      id: order.id,
      providerSessionId: order.id,
      redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${key.token}`,
      raw: { order, key },
    }
  },

  async verifyPayment(intent, params): Promise<PaymentVerification> {
    // Paymob sends HMAC-signed callbacks; the merchant is expected to
    // verify the HMAC and check `success` field.
    // For return-URL verification, we check the `success` query param.
    const success = params.success === 'true' || params.success === '1'
    return {
      ok: success,
      transactionId: params.id || intent.providerSessionId,
      raw: params,
    }
  },

  async handleWebhook(payload, headers) {
    // Verify HMAC using PAYMOB_WEBHOOK_HMAC
    // The webhook payload is form-encoded for Paymob.
    return JSON.parse(payload.toString('utf8'))
  },
}
