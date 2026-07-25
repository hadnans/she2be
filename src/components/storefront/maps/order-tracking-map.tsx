'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Truck, MapPin, Navigation, Clock, Package, CheckCircle2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { OsmMap, MapMarker } from '@/components/storefront/maps/osm-map'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient } from '@/lib/api'

interface Props {
  orderId: string
}

interface Tracking {
  id: string
  status: string
  estimatedMinutes: number | null
  distanceMeters: number | null
  customerLatitude: number | null
  customerLongitude: number | null
  routeJson: string | null
  pickedUpAt: string | null
  deliveredAt: string | null
  warehouse: {
    id: string
    name: string
    address: string
    latitude: number
    longitude: number
  } | null
  driver: {
    id: string
    name: string
    phone: string
    latitude: number | null
    longitude: number | null
    lastSeenAt: string | null
  } | null
}

const STAGES = [
  { key: 'preparing', label: 'Preparing your order', icon: Package },
  { key: 'picked_up', label: 'Picked up by driver', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: Navigation },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
]

const STAGE_ORDER = ['preparing', 'picked_up', 'out_for_delivery', 'delivered']

export function OrderTrackingMap({ orderId }: Props) {
  const { user, loading: authLoading } = useAuth()
  const [tracking, setTracking] = useState<Tracking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/orders/${orderId}/track`, { credentials: 'same-origin' })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setTracking(data.tracking)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    // Poll every 30 seconds for live updates
    const interval = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [orderId, user])

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (!tracking) {
    return (
      <Card className="p-8 text-center">
        <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-semibold mb-1">Tracking not available yet</h3>
        <p className="text-sm text-muted-foreground">
          We'll start tracking your order as soon as it's prepared for delivery.
        </p>
      </Card>
    )
  }

  // Build markers
  const markers: MapMarker[] = []
  if (tracking.warehouse) {
    markers.push({
      lat: tracking.warehouse.latitude,
      lng: tracking.warehouse.longitude,
      title: tracking.warehouse.name,
      popup: `<strong>Warehouse</strong><br/>${tracking.warehouse.name}<br/>${tracking.warehouse.address}`,
      color: 'orange',
    })
  }
  if (tracking.driver?.latitude && tracking.driver?.longitude) {
    markers.push({
      lat: tracking.driver.latitude,
      lng: tracking.driver.longitude,
      title: tracking.driver.name,
      popup: `<strong>Driver</strong><br/>${tracking.driver.name}<br/>${tracking.driver.phone}`,
      isDriver: true,
    })
  }
  if (tracking.customerLatitude && tracking.customerLongitude) {
    markers.push({
      lat: tracking.customerLatitude,
      lng: tracking.customerLongitude,
      title: 'Delivery address',
      popup: '<strong>Your delivery address</strong>',
      color: 'green',
    })
  }

  // Build route polyline if routeJson exists
  let route: [number, number][] = []
  if (tracking.routeJson) {
    try {
      const parsed = JSON.parse(tracking.routeJson)
      if (Array.isArray(parsed)) {
        route = parsed.map((p: any) => [p.lat, p.lng] as [number, number])
      } else if (parsed?.coordinates && Array.isArray(parsed.coordinates)) {
        // GeoJSON LineString: coords are [lng, lat]
        route = parsed.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number])
      }
    } catch {}
  }

  const currentStageIdx = STAGE_ORDER.indexOf(tracking.status)
  const progressPct = ((currentStageIdx + 1) / STAGES.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Map */}
      <OsmMap
        markers={markers}
        route={route}
        height="360px"
      />

      {/* Progress bar */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Delivery status</h3>
            <p className="text-xs text-muted-foreground">
              {tracking.estimatedMinutes
                ? `~${tracking.estimatedMinutes} min away`
                : 'Estimated time will update once dispatched'}
            </p>
          </div>
          <Badge className="capitalize">{tracking.status.replace(/_/g, ' ')}</Badge>
        </div>

        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-primary"
            />
          </div>
          <div className="relative flex justify-between">
            {STAGES.map((stage, idx) => {
              const isDone = idx <= currentStageIdx
              const Icon = stage.icon
              return (
                <div key={stage.key} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isDone
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className={`text-[10px] text-center w-16 ${
                    isDone ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {stage.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Driver + warehouse info */}
      <div className="grid sm:grid-cols-2 gap-4">
        {tracking.driver && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Your driver</h4>
            </div>
            <div className="text-sm font-medium">{tracking.driver.name}</div>
            <div className="text-xs text-muted-foreground">{tracking.driver.phone}</div>
            {tracking.driver.lastSeenAt && (
              <div className="text-xs text-muted-foreground mt-1">
                <Clock className="inline h-3 w-3 mr-1" />
                Last seen {new Date(tracking.driver.lastSeenAt).toLocaleTimeString()}
              </div>
            )}
          </Card>
        )}
        {tracking.warehouse && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">From warehouse</h4>
            </div>
            <div className="text-sm font-medium">{tracking.warehouse.name}</div>
            <div className="text-xs text-muted-foreground">{tracking.warehouse.address}</div>
            {tracking.distanceMeters && (
              <div className="text-xs text-muted-foreground mt-1">
                <Navigation className="inline h-3 w-3 mr-1" />
                {(tracking.distanceMeters / 1000).toFixed(1)} km away
              </div>
            )}
          </Card>
        )}
      </div>

      {!tracking.driver && tracking.status === 'preparing' && (
        <Card className="p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="text-sm">
            <div className="font-medium">Your order is being prepared</div>
            <div className="text-xs text-muted-foreground">
              A driver will be assigned shortly.
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  )
}
