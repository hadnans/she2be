/**
 * Password hashing using Node's built-in scrypt.
 * Format: "scrypt$<salt-hex>$<hash-hex>"
 */
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plain, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = parts[1]
  const hash = parts[2]
  const test = scryptSync(plain, salt, 64)
  const hashBuf = Buffer.from(hash, 'hex')
  if (test.length !== hashBuf.length) return false
  return timingSafeEqual(test, hashBuf)
}
