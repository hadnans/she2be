/**
 * Fawry payment adapter (Egypt's largest cash-collection network).
 *
 * Required env vars:
 *   FAWRY_MERCHANT_CODE=...
 *   FAWRY_SECURITY_KEY=... (HMAC SHA-256 secret)
 *   FAWRY_SANDBOX=true|false
 *
 * Flow: Fawry uses a "charge request" that returns a reference number.
 * The customer pays at any Fawry kiosk/ATM/online within 24h. Webhook
 * callback updates the order status.
 *
 * API docs: https://developer.fawrystaging.com/
 */
import crypto from 'crypto'
import { PaymentAdapter, PaymentContext, PaymentIntent, PaymentVerification } from './types'

const FAWRY_BASE = process.env.FAWRY_SANDBOX === 'true'
  ? 'https://atfawry.fawrystaging.com/ECommerceWeb/Fawry/payments'
  : 'https://www.atfawry.com/ECommerceWeb/Fawry/payments'

export const fawryAdapter: PaymentAdapter = {
  id: 'fawry',
  displayName: 'Fawry (Pay at kiosk / ATM)',
  isConfigured: () => !!(process.env.FAWRY_MERCHANT_CODE && process.env.FAWRY_SECURITY_KEY),

  async createIntent(ctx: PaymentContext): Promise<PaymentIntent> {
    const merchantCode = process.env.FAWRY_MERCHANT_CODE!
    const securityKey = process.env.FAWRY_SECURITY_KEY!

    // Fawry charge request — customer pays at kiosk using reference number
    const merchantRefNum = ctx.orderNumber
    const signatureInput = `${merchantCode}${merchantRefNum}${ctx.customer.phone || ''}${ctx.amountPiasters}${ctx.currency === 'EGP' ? '' : ctx.currency}${securityKey}`
    const signature = crypto.createHash('sha256').update(signatureInput).digest('hex')

    const chargeItems = [{
      itemId: ctx.orderId,
      description: `Order ${ctx.orderNumber}`,
      price: ctx.amountPiasters / 100,
      quantity: 1,
    }]

    const body = {
      merchantCode,
      merchantRefNum,
      customerProfileId: ctx.customer.email,
      customerMobile: ctx.customer.phone || '',
      paymentMethod: 'PAYATFAWRY',
      amount: ctx.amountPiasters / 100,
      currencyCode: ctx.currency,
      description: `Order ${ctx.orderNumber}`,
      chargeItems,
      signature,
    }

    const res = await fetch(`${FAWRY_BASE}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Fawry charge failed: ${res.status}`)
    const data = await res.json()

    return {
      id: merchantRefNum,
      providerSessionId: data.referenceNumber,
      // No redirect — customer goes to Fawry kiosk with the reference number.
      redirectUrl: undefined,
      raw: data,
    }
  },

  async verifyPayment(intent, params): Promise<PaymentVerification> {
    const securityKey = process.env.FAWRY_SECURITY_KEY
    if (!securityKey) return { ok: false, error: 'Fawry not configured' }

    // Verify HMAC signature from callback
    const signatureInput = `${process.env.FAWRY_MERCHANT_CODE}${intent.providerSessionId}${params.paymentAmount || ''}${params.orderStatus || ''}${params.methodId || ''}${securityKey}`
    const expectedSig = crypto.createHash('sha256').update(signatureInput).digest('hex')

    if (params.signature && params.signature !== expectedSig) {
      return { ok: false, error: 'Invalid signature' }
    }

    // For PAYATFAWRY, we can't confirm immediately — the customer pays later.
    // The intent was created successfully; webhook will mark as paid.
    return {
      ok: params.orderStatus === 'PAID' || !params.orderStatus, // success if no status (initial check)
      transactionId: intent.providerSessionId,
      raw: params,
    }
  },

  async handleWebhook(payload, headers) {
    return JSON.parse(payload.toString('utf8'))
  },
}
