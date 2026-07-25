/**
 * Maps integration — uses OpenStreetMap's free Nominatim API for geocoding
 * and OSRM's public demo server for routing. No API key required.
 *
 * For production with higher volume, swap to Mapbox or Google Maps by
 * setting these env vars:
 *   MAPS_PROVIDER=mapbox|google|osm
 *   MAPBOX_ACCESS_TOKEN=... (if mapbox)
 *   GOOGLE_MAPS_API_KEY=... (if google)
 *
 * The functions below abstract the provider choice so the rest of the
 * app doesn't care which one is in use.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const OSRM_BASE = 'https://router.project-osrm.org'

export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
  type: string
  city?: string
  area?: string
  country?: string
}

export interface RouteInfo {
  distanceMeters: number
  durationMinutes: number
  geometry?: any // GeoJSON LineString
}

const provider = process.env.MAPS_PROVIDER || 'osm'

/**
 * Geocode an address string → coordinates.
 */
export async function geocode(query: string): Promise<GeocodeResult[]> {
  if (provider === 'google' && process.env.GOOGLE_MAPS_API_KEY) {
    return geocodeGoogle(query)
  }
  // Default: OpenStreetMap Nominatim (free, no key)
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`
  const res = await fetch(url, {
    headers: {
      // Nominatim requires a User-Agent identifying the app
      'User-Agent': 'She2Be/1.0 (grocery platform)',
    },
  })
  if (!res.ok) throw new Error(`Geocode failed: ${res.status}`)
  const data = await res.json()
  return data.map((d: any) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    displayName: d.display_name,
    type: d.type,
    city: d.address?.city || d.address?.town || d.address?.village,
    area: d.address?.state,
    country: d.address?.country,
  }))
}

async function geocodeGoogle(query: string): Promise<GeocodeResult[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY!
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google geocode failed: ${res.status}`)
  const data = await res.json()
  return data.results.map((r: any) => ({
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    displayName: r.formatted_address,
    type: r.types?.[0] || 'unknown',
    city: r.address_components?.find((c: any) => c.types.includes('locality'))?.long_name,
    area: r.address_components?.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name,
    country: r.address_components?.find((c: any) => c.types.includes('country'))?.long_name,
  }))
}

/**
 * Calculate driving distance + duration between two points.
 * Uses OSRM (Open Source Routing Machine) for free, no API key.
 */
export async function calculateRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteInfo> {
  if (provider === 'google' && process.env.GOOGLE_MAPS_API_KEY) {
    return calcGoogleRoute(from, to)
  }
  if (provider === 'mapbox' && process.env.MAPBOX_ACCESS_TOKEN) {
    return calcMapboxRoute(from, to)
  }
  // Default: OSRM
  const url = `${OSRM_BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM failed: ${res.status}`)
  const data = await res.json()
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found')
  }
  const route = data.routes[0]
  return {
    distanceMeters: route.distance,
    durationMinutes: Math.round(route.duration / 60),
    geometry: route.geometry,
  }
}

async function calcMapboxRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteInfo> {
  const token = process.env.MAPBOX_ACCESS_TOKEN!
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&access_token=${token}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Mapbox failed: ${res.status}`)
  const data = await res.json()
  const route = data.routes[0]
  return {
    distanceMeters: route.distance,
    durationMinutes: Math.round(route.duration / 60),
    geometry: route.geometry,
  }
}

async function calcGoogleRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteInfo> {
  const key = process.env.GOOGLE_MAPS_API_KEY!
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google failed: ${res.status}`)
  const data = await res.json()
  const route = data.routes[0]?.legs[0]
  if (!route) throw new Error('No route found')
  return {
    distanceMeters: route.distance.value,
    durationMinutes: Math.round(route.duration.value / 60),
  }
}

/**
 * Haversine distance between two coordinates, in meters.
 * Useful for sorting warehouses by distance without an API call.
 */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000 // Earth radius in meters
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return R * c
}

export const MAPS_PROVIDER = provider
