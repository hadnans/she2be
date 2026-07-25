'use client'

import { useEffect, useRef, useState } from 'react'
import type LType from 'leaflet'

export interface MapMarker {
  lat: number
  lng: number
  title?: string
  popup?: string
  color?: string // 'blue' | 'green' | 'red' | 'orange'
  isDriver?: boolean
}

interface Props {
  center?: [number, number]
  zoom?: number
  markers?: MapMarker[]
  route?: [number, number][] // polyline points
  className?: string
  height?: string
}

const COLOR_ICONS: Record<string, string> = {
  blue: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  green: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  red: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  orange: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
}

export function OsmMap({
  center = [30.0444, 31.2357], // Cairo by default
  zoom = 11,
  markers = [],
  route = [],
  className = '',
  height = '400px',
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<LType.Map | null>(null)
  const [L, setL] = useState<typeof LType | null>(null)

  // Dynamic import to avoid SSR issues (leaflet needs window)
  useEffect(() => {
    let mounted = true
    import('leaflet').then((mod) => {
      if (!mounted) return
      const leaflet = mod.default
      // Fix default icon paths (broken with bundlers)
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setL(leaflet)
    })
    import('leaflet/dist/leaflet.css').catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!L || !mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [L])

  // Update markers + route when they change
  useEffect(() => {
    const map = mapInstance.current
    if (!L || !map) return

    const layer = L.layerGroup().addTo(map)

    markers.forEach((m) => {
      const icon = m.isDriver
        ? driverIcon(L)
        : m.color
        ? L.icon({
            iconUrl: COLOR_ICONS[m.color] || COLOR_ICONS.blue,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
          })
        : undefined

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(layer)
      if (m.popup) marker.bindPopup(m.popup)
      if (m.title) marker.bindTooltip(m.title)
    })

    if (route.length >= 2) {
      L.polyline(route, { color: '#0a5c3e', weight: 4, opacity: 0.7 }).addTo(layer)
      map.fitBounds(L.latLngBounds(route), { padding: [50, 50] })
    } else if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    return () => {
      map.removeLayer(layer)
    }
  }, [markers, route, L])

  if (!L) {
    return (
      <div
        className={`rounded-lg overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-sm ${className}`}
        style={{ height, width: '100%' }}
      >
        Loading map...
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className={`rounded-lg overflow-hidden border ${className}`}
      style={{ height, width: '100%' }}
    />
  )
}

function driverIcon(L: typeof LType) {
  return L.divIcon({
    className: 'driver-marker',
    html: `<div style="
      background: #16a34a;
      border: 3px solid white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    ">🚗</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}
