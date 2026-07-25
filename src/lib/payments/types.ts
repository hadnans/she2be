/**
 * Payment adapter interface — every payment provider implements this.
 *
 * The architecture is intentionally provider-agnostic so the checkout
 * flow never knows which gateway it's using. Adding a new provider
 * means:
 *   1. Create `<provider>.ts` in this folder that implements PaymentAdapter.
 *   2. Register it in `index.ts` `paymentAdapters` map.
 *   3. Add the provider ID to the checkout UI button list.
 *
 * No changes to checkout logic, order schema, or API routes are needed.
 */

export type PaymentProviderId =
  | 'stripe'
  | 'paymob'
  | 'fawry'
  | 'instapay'
  | 'vodafone_cash'
  | 'apple_pay'
  | 'cod' // cash on delivery (always available as fallback)

export interface PaymentIntent {
  /** Internal intent ID we generate (used to track across webhook callbacks). */
  id: string
  /** Provider-specific session/checkout/order ID. */
  providerSessionId: string
  /** URL the customer should be redirected to (if redirect-based). */
  redirectUrl?: string
  /** For embedded flows (Apple Pay, Stripe Elements) — client-side secret/token. */
  clientSecret?: string
  /** Raw provider response, kept for debugging. */
  raw?: unknown
}

export interface PaymentContext {
  orderId: string
  orderNumber: string
  amountPiasters: number
  currency: string // 'EGP', 'USD', etc.
  customer: {
    email: string
    name: string
    phone?: string | null
  }
  /** Where to send the customer after successful payment. */
  successUrl: string
  /** Where to send the customer if they cancel. */
  cancelUrl: string
  /** Optional webhook URL the provider can call. */
  webhookUrl?: string
}

export interface PaymentVerification {
  ok: boolean
  /** Provider's transaction/reference ID. */
  transactionId?: string
  /** Raw provider response. */
  raw?: unknown
  /** Error message if !ok. */
  error?: string
}

export interface PaymentAdapter {
  /** Stable identifier (matches PaymentProviderId). */
  id: PaymentProviderId
  /** Human-readable name for UI. */
  displayName: string
  /** True if the adapter is configured (has required env vars). */
  isConfigured(): boolean
  /** Create a payment intent / checkout session with the provider. */
  createIntent(ctx: PaymentContext): Promise<PaymentIntent>
  /** Verify a payment after the customer returns or via webhook. */
  verifyPayment(intent: PaymentIntent, params: Record<string, string>): Promise<PaymentVerification>
  /**
   * Optional: handle a webhook from the provider. Should return 200-style
   * response body (object) or throw on signature mismatch.
   */
  handleWebhook?(payload: Buffer, headers: Record<string, string>): Promise<unknown>
}
