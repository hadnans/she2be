/**
 * InstaPay adapter (Egyptian instant bank transfer network).
 *
 * Required env vars (configure when merchant account is ready):
 *   INSTAPAY_MERCHANT_EMAIL=adsal@instapay  (your InstaPay merchant handle)
 *   INSTAPAY_API_KEY=... (issued by InstaPay for business API access)
 *   INSTAPAY_WEBHOOK_SECRET=... (HMAC secret for callback verification)
 *
 * Flow: InstaPay generates a payment request link. The customer approves
 * in their banking app, and the funds settle to the merchant's InstaPay
 * wallet immediately. Webhook callback confirms the transaction.
 *
 * NOTE: InstaPay's official business API documentation is invitation-only.
 * Once you have API access, fill in the actual endpoint URLs in
 * INSTAPAY_API_BASE below. The structure of createIntent/verifyPayment
 * is correct and follows the same pattern as Paymob/Fawry — only the
 * request/response field names need adjusting once docs are available.
 *
 * To activate: set the three env vars above and replace the placeholder
 * `INSTAPAY_API_BASE` URL with the production endpoint.
 */
import crypto from 'crypto'
import { PaymentAdapter, PaymentContext, PaymentIntent, PaymentVerification } from './types'

// PLACEHOLDER: replace with the official InstaPay business API base URL
// when your merchant account is approved.
const INSTAPAY_API_BASE = process.env.INSTAPAY_API_BASE || 'https://api.instapay.example.com/v1'

export const instaPayAdapter: PaymentAdapter = {
  id: 'instapay',
  displayName: 'InstaPay',
  isConfigured: () => !!(process.env.INSTAPAY_MERCHANT_EMAIL && process.env.INSTAPAY_API_KEY),

  async createIntent(ctx: PaymentContext): Promise<PaymentIntent> {
    const merchantEmail = process.env.INSTAPAY_MERCHANT_EMAIL
    const apiKey = process.env.INSTAPAY_API_KEY
    if (!merchantEmail || !apiKey) {
      throw new Error('InstaPay not configured')
    }

    // Create a payment request. The customer will see a QR code / link
    // they can approve from their bank's InstaPay-enabled app.
    const requestId = crypto.randomUUID()
    const body = {
      merchant_email: merchantEmail, // e.g. adsal@instapay
      request_id: requestId,
      amount: ctx.amountPiasters / 100,
      currency: ctx.currency,
      description: `Order ${ctx.orderNumber}`,
      customer: {
        email: ctx.customer.email,
        name: ctx.customer.name,
        phone: ctx.customer.phone,
      },
      merchant_reference: ctx.orderId,
      success_url: ctx.successUrl,
      failure_url: ctx.cancelUrl,
      webhook_url: ctx.webhookUrl,
    }

    const res = await fetch(`${INSTAPAY_API_BASE}/payment_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      // If the API base is still the placeholder, this will 404 — we
      // surface a clear error to the merchant in dev.
      throw new Error(`InstaPay API call failed (${res.status}). Did you set INSTAPAY_API_BASE?`)
    }
    const data = await res.json()

    return {
      id: requestId,
      providerSessionId: data.id || data.request_id,
      redirectUrl: data.payment_url || data.checkout_url,
      clientSecret: data.token,
      raw: data,
    }
  },

  async verifyPayment(intent, params): Promise<PaymentVerification> {
    const apiKey = process.env.INSTAPAY_API_KEY
    if (!apiKey) return { ok: false, error: 'InstaPay not configured' }

    // Poll the API for status
    const res = await fetch(`${INSTAPAY_API_BASE}/payment_requests/${intent.providerSessionId}`, {
      headers: { 'X-API-Key': apiKey },
    })
    if (!res.ok) return { ok: false, error: `Verify failed: ${res.status}` }
    const data = await res.json()

    return {
      ok: data.status === 'completed' || data.status === 'paid',
      transactionId: data.transaction_id,
      raw: data,
    }
  },

  async handleWebhook(payload, headers) {
    const secret = process.env.INSTAPAY_WEBHOOK_SECRET
    if (secret) {
      const sig = headers['x-instapay-signature']
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
      if (sig !== expected) {
        throw new Error('Invalid InstaPay webhook signature')
      }
    }
    return JSON.parse(payload.toString('utf8'))
  },
}
