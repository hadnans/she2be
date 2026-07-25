/**
 * Vodafone Cash adapter (Egyptian mobile wallet).
 *
 * Required env vars:
 *   VODAFONE_CASH_MERCHANT_MSISDN=... (your merchant wallet number, e.g. 010xxxxxxxx)
 *   VODAFONE_CASH_API_KEY=... (Vodafone Cash Business API key)
 *   VODAFONE_CASH_USERNAME=... (issued by Vodafone Cash Business)
 *   VODAFONE_CASH_PASSWORD=... (issued by Vodafone Cash Business)
 *
 * Flow: Vodafone Cash Business API generates a payment request. The
 * customer receives a USSD prompt on their phone to confirm the
 * payment from their Vodafone Cash wallet.
 *
 * NOTE: Vodafone Cash Business API access is granted by Vodafone Egypt.
 * The endpoint structure below follows the public docs at
 * https://business.vodafone.com.eg/. Once you have credentials,
 * set the env vars and the adapter will start working.
 */
import crypto from 'crypto'
import { PaymentAdapter, PaymentContext, PaymentIntent, PaymentVerification } from './types'

const VODAFONE_API_BASE = 'https://business.vodafone.com.eg/api/cash/v1'

export const vodafoneCashAdapter: PaymentAdapter = {
  id: 'vodafone_cash',
  displayName: 'Vodafone Cash',
  isConfigured: () => !!(process.env.VODAFONE_CASH_MERCHANT_MSISDN && process.env.VODAFONE_CASH_API_KEY),

  async createIntent(ctx: PaymentContext): Promise<PaymentIntent> {
    const merchantMsisdn = process.env.VODAFONE_CASH_MERCHANT_MSISDN
    const apiKey = process.env.VODAFONE_CASH_API_KEY
    const username = process.env.VODAFONE_CASH_USERNAME
    const password = process.env.VODAFONE_CASH_PASSWORD
    if (!merchantMsisdn || !apiKey || !username || !password) {
      throw new Error('Vodafone Cash not configured')
    }

    // Generate payment request
    const txnRef = ctx.orderNumber
    const body = {
      merchantMSISDN: merchantMsisdn,
      transactionReference: txnRef,
      amount: ctx.amountPiasters / 100,
      currency: ctx.currency,
      customerMSISDN: ctx.customer.phone,
      description: `Order ${ctx.orderNumber}`,
      callbackUrl: ctx.webhookUrl,
      // Customer will be redirected here after they approve on their phone
      successUrl: ctx.successUrl,
      failureUrl: ctx.cancelUrl,
    }

    // Basic auth + API key
    const auth = Buffer.from(`${username}:${password}`).toString('base64')
    const res = await fetch(`${VODAFONE_API_BASE}/payments/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`Vodafone Cash API failed: ${res.status}`)
    }
    const data = await res.json()

    return {
      id: txnRef,
      providerSessionId: data.paymentId || data.transactionId,
      redirectUrl: data.redirectUrl,
      clientSecret: data.token,
      raw: data,
    }
  },

  async verifyPayment(intent, params): Promise<PaymentVerification> {
    const apiKey = process.env.VODAFONE_CASH_API_KEY
    const username = process.env.VODAFONE_CASH_USERNAME
    const password = process.env.VODAFONE_CASH_PASSWORD
    if (!apiKey || !username || !password) {
      return { ok: false, error: 'Vodafone Cash not configured' }
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64')
    const res = await fetch(`${VODAFONE_API_BASE}/payments/${intent.providerSessionId}/status`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'X-API-Key': apiKey,
      },
    })
    if (!res.ok) return { ok: false, error: `Verify failed: ${res.status}` }
    const data = await res.json()

    return {
      ok: data.status === 'SUCCESS' || data.status === 'COMPLETED',
      transactionId: data.transactionId,
      raw: data,
    }
  },

  async handleWebhook(payload, headers) {
    const secret = process.env.VODAFONE_CASH_WEBHOOK_SECRET
    if (secret) {
      const sig = headers['x-vodafone-signature']
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
      if (sig !== expected) {
        throw new Error('Invalid Vodafone Cash webhook signature')
      }
    }
    return JSON.parse(payload.toString('utf8'))
  },
}
