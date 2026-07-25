#!/usr/bin/env node
/**
 * End-to-end smoke test for new features.
 * Runs against the local dev server.
 */
const BASE = 'http://localhost:3000'

async function check(method, path, expectedStatus = 200, body = null) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
    const ok = res.status === expectedStatus
    const status = ok ? '✓' : '✗'
    let detail = ''
    if (!ok) {
      try { detail = (await res.text()).slice(0, 200) } catch {}
    }
    console.log(`${status} ${method} ${path} -> ${res.status}${detail ? ` | ${detail}` : ''}`)
    return res
  } catch (e) {
    console.log(`✗ ${method} ${path} -> ERROR: ${e.message}`)
    return null
  }
}

async function main() {
  console.log('=== Public routes ===')
  await check('GET', '/')
  await check('GET', '/admin/analytics')
  await check('GET', '/admin/warehouses')
  await check('GET', '/order-tracking/test-id')

  console.log('\n=== API routes (no auth) ===')
  await check('GET', '/api/payments/providers')
  await check('GET', '/api/warehouses')
  await check('GET', '/api/search?q=banana')
  await check('GET', '/api/maps/geocode?q=Cairo')

  console.log('\n=== API routes (POST) ===')
  await check('POST', '/api/maps/distance', 200, {
    from: { lat: 30.0444, lng: 31.2357 },
    to: { lat: 30.0566, lng: 31.2402 },
  })

  console.log('\n=== API routes (require admin) ===')
  await check('GET', '/api/admin/analytics', 401)
  await check('GET', '/api/admin/orders', 401)

  console.log('\n=== Done ===')
}

main().catch(console.error)
