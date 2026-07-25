/**
 * Payment adapter registry.
 *
 * To add a new provider:
 *   1. Create `<provider>.ts` implementing PaymentAdapter.
 *   2. Import and register it in `paymentAdapters` below.
 *   3. Add the provider ID to the UI button list (PaymentSelector component).
 *
 * The checkout API route uses `getAdapter(id)` to find the right one.
 */
import { PaymentAdapter, PaymentProviderId } from './types'
import { codAdapter } from './cod'
import { stripeAdapter } from './stripe'
import { paymobAdapter } from './paymob'
import { fawryAdapter } from './fawry'
import { instaPayAdapter } from './instapay'
import { vodafoneCashAdapter } from './vodafone-cash'
import { applePayAdapter } from './apple-pay'

export const paymentAdapters: Record<PaymentProviderId, PaymentAdapter> = {
  cod: codAdapter,
  stripe: stripeAdapter,
  paymob: paymobAdapter,
  fawry: fawryAdapter,
  instapay: instaPayAdapter,
  vodafone_cash: vodafoneCashAdapter,
  apple_pay: applePayAdapter,
}

export function getAdapter(id: string): PaymentAdapter {
  const adapter = paymentAdapters[id as PaymentProviderId]
  if (!adapter) {
    throw new Error(`Unknown payment provider: ${id}`)
  }
  return adapter
}

export function listAvailableAdapters(): PaymentAdapter[] {
  return Object.values(paymentAdapters)
}

export function listConfiguredAdapters(): PaymentAdapter[] {
  return Object.values(paymentAdapters).filter((a) => a.isConfigured())
}

export { type PaymentAdapter, type PaymentProviderId } from './types'
