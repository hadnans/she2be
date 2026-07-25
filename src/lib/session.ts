/**
 * Lightweight session helper for She2Be.
 *
 * We avoid JWT libs to keep deps minimal — instead we sign a cookie
 * containing the userId + role + an HMAC. The HMAC uses SESSION_SECRET
 * (or a deterministic dev fallback if unset).
 *
 * This is NOT a hardened auth library — it's sufficient for a v1
 * dev/staging environment. For production, swap in NextAuth or a
 * proper JWT library (see /docs/AUTH_UPGRADE.md placeholder).
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { db } from './db'

const COOKIE_NAME = 'she2be_session'
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production-please-change'

export interface SessionPayload {
  userId: string
  role: string
  email: string
}

function sign(payload: SessionPayload): string {
  const json = JSON.stringify(payload)
  const b64 = Buffer.from(json).toString('base64url')
  const sig = createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

function verify(token: string): SessionPayload | null {
  const [b64, sig] = token.split('.')
  if (!b64 || !sig) return null
  const expected = createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url')
  if (sig !== expected) return null
  try {
    const json = Buffer.from(b64, 'base64url').toString('utf8')
    return JSON.parse(json) as SessionPayload
  } catch {
    return null
  }
}

/**
 * Set the session cookie on a NextResponse object using NextResponse's
 * cookies API. This is the reliable way to set cookies in Route Handlers.
 */
export function setSessionCookieOnResponse(
  res: NextResponse,
  payload: SessionPayload
) {
  const token = sign(payload)
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export function clearSessionCookieOnResponse(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

// Keep the old async versions for backwards-compat (used by Server Actions
// if any are added later).
export async function setSessionCookie(payload: SessionPayload) {
  const token = sign(payload)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verify(token)
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      isActive: true,
    },
  })
  if (!user || !user.isActive) return null
  return user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    const err = new Error('Unauthorized') as any
    err.status = 401
    throw err
  }
  return user
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    const err = new Error('Unauthorized') as any
    err.status = 401
    throw err
  }
  if (user.role !== 'admin') {
    const err = new Error('Forbidden') as any
    err.status = 403
    throw err
  }
  return user
}

/**
 * Wrap a route handler so auth errors are returned as proper JSON
 * responses instead of crashing the route.
 */
import { NextResponse } from 'next/server'

export function withAuth<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  requiredRole: 'user' | 'admin' = 'user'
) {
  return async (...args: T): Promise<Response> => {
    try {
      if (requiredRole === 'admin') {
        await requireAdmin()
      } else {
        await requireUser()
      }
      return await handler(...args)
    } catch (e: any) {
      if (e?.message === 'Unauthorized' || e?.status === 401) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (e?.message === 'Forbidden' || e?.status === 403) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      console.error('Route error:', e)
      return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
    }
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME
