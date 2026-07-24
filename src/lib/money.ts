/**
 * Money helpers — all monetary amounts in the DB are stored as integer
 * minor units (piasters, for an EG-centric store). 1 EGP = 100 piasters.
 *
 * UI never sees the raw integer; we always format to a string with the
 * currency symbol. This isolates "how money is displayed" to one file.
 */

const CURRENCY_SYMBOL = 'EGP'

export function piastersToEgp(piasters: number): number {
  return piasters / 100
}

export function egpToPiasters(egp: number): number {
  return Math.round(egp * 100)
}

export function formatEgp(piasters: number): string {
  const egp = piastersToEgp(piasters)
  return `${egp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY_SYMBOL}`
}

export function formatEgpShort(piasters: number): string {
  const egp = piastersToEgp(piasters)
  return `${egp.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${CURRENCY_SYMBOL}`
}

export { CURRENCY_SYMBOL }
