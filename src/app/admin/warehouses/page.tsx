'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, MapPin, Phone, Star, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient } from '@/lib/api'
import { OsmMap, MapMarker } from '@/components/storefront/maps/osm-map'
import { toast } from 'sonner'

interface Warehouse {
  id: string
  name: string
  slug: string
  address: string
  city: string
  area: string | null
  latitude: number
  longitude: number
  phone: string | null
  isActive: boolean
  isDefault: boolean
  _count?: { drivers: number }
}

export default function AdminWarehousesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loadingW, setLoadingW] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', city: 'Cairo', area: '', phone: '',
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login?redirect=/admin/warehouses')
    }
  }, [user, loading, router])

  const load = async () => {
    setLoadingW(true)
    try {
      const res = await apiClient.listPaymentProviders() // placeholder
    } catch {}
    try {
      const r = await fetch('/api/warehouses', { credentials: 'same-origin' })
      const data = await r.json()
      setWarehouses(data.items)
    } finally {
      setLoadingW(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'admin') load()
  }, [user])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      toast.success('Warehouse created')
      setForm({ name: '', address: '', city: 'Cairo', area: '', phone: '' })
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function makeDefault(id: string) {
    try {
      await fetch(`/api/warehouses/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      toast.success('Default warehouse updated')
      load()
    } catch {
      toast.error('Update failed')
    }
  }

  async function remove(id: string) {
    if (!confirm('Deactivate this warehouse? It will no longer be available for new orders.')) return
    try {
      await fetch(`/api/warehouses/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      toast.success('Warehouse deactivated')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const mapMarkers: MapMarker[] = warehouses.map((w) => ({
    lat: w.latitude,
    lng: w.longitude,
    title: w.name,
    popup: `<strong>${w.name}</strong><br/>${w.address}<br/>${w.city}`,
    color: w.isDefault ? 'green' : 'orange',
  }))

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Warehouses</h1>
            <p className="text-sm text-muted-foreground">
              {warehouses.length} active location{warehouses.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4 mr-1" />
            New warehouse
          </Button>
        </div>

        {/* Map showing all warehouses */}
        {warehouses.length > 0 && (
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-medium mb-3">Warehouse locations</h3>
            <OsmMap markers={mapMarkers} height="320px" />
          </Card>
        )}

        {showForm && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-4">New warehouse</h3>
            <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wname">Name *</Label>
                <Input
                  id="wname"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. New Cairo Hub"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wphone">Phone</Label>
                <Input
                  id="wphone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+20 100 000 0000"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="waddr">Address *</Label>
                <Input
                  id="waddr"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                  placeholder="Street, building, district..."
                />
                <p className="text-xs text-muted-foreground">
                  We'll auto-geocode the address to plot it on the map.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wcity">City *</Label>
                <Input
                  id="wcity"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warea">Area</Label>
                <Input
                  id="warea"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Create warehouse'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loadingW ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : warehouses.length === 0 ? (
          <Card className="p-12 text-center">
            <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="font-semibold mb-1">No warehouses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a fulfillment location to start tracking deliveries on the map.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add warehouse
            </Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      w.isDefault ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.city}{w.area ? `, ${w.area}` : ''}</div>
                    </div>
                  </div>
                  {w.isDefault && (
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Default
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2 mb-2">{w.address}</div>
                {w.phone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {w.phone}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {w._count?.drivers ?? 0} driver{(w._count?.drivers ?? 0) === 1 ? '' : 's'} available
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  {!w.isDefault && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => makeDefault(w.id)}>
                      Set default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(w.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
