/**
 * Cash on Delivery adapter — always available, no configuration needed.
 * Used as a fallback when no online payment is selected.
 */
import { PaymentAdapter, PaymentContext, PaymentIntent, PaymentVerification } from './types'

export const codAdapter: PaymentAdapter = {
  id: 'cod',
  displayName: 'Cash on Delivery',
  isConfigured: () => true,

  async createIntent(ctx: PaymentContext): Promise<PaymentIntent> {
    // No remote intent — just return a synthetic one.
    return {
      id: `cod_${ctx.orderId}`,
      providerSessionId: `cod_${ctx.orderId}`,
      // No redirect — the customer stays on the order confirmation page.
      redirectUrl: ctx.successUrl,
    }
  },

  async verifyPayment(_intent, _params): Promise<PaymentVerification> {
    // COD is always "approved" at intent time; actual cash collection
    // happens at delivery. Mark as paid=unpaid until driver confirms.
    return {
      ok: true,
      transactionId: 'cod_pending',
    }
  },
}
