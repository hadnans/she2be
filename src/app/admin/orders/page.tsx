'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient } from '@/lib/api'
import { formatEgp } from '@/lib/money'
import { toast } from 'sonner'

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  subtotalPiasters: number
  deliveryFeePiasters: number
  discountPiasters: number
  totalPiasters: number
  placedAt: string
  paidAt: string | null
  deliveredAt: string | null
  deliveryName: string
  deliveryPhone: string
  deliveryAddress: string
  deliveryCity: string
  deliveryArea: string | null
  deliveryNotes: string | null
  couponCode: string | null
  user: { id: string; name: string | null; email: string }
  items: Array<{
    id: string
    productName: string
    quantity: number
    pricePiasters: number
    lineTotalPiasters: number
    unit: string | null
  }>
}

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-900' },
  { value: 'paid', label: 'Paid', color: 'bg-blue-100 text-blue-900' },
  { value: 'preparing', label: 'Preparing', color: 'bg-purple-100 text-purple-900' },
  { value: 'out_for_delivery', label: 'Out for delivery', color: 'bg-indigo-100 text-indigo-900' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-900' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-900' },
  { value: 'refunded', label: 'Refunded', color: 'bg-gray-100 text-gray-900' },
]

function statusBadge(status: string) {
  const s = STATUSES.find((s) => s.value === status) || STATUSES[0]
  return <Badge className={s.color}>{s.label}</Badge>
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Order | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login?redirect=/admin/orders')
    }
  }, [user, loading, router])

  const load = async () => {
    setLoadingOrders(true)
    try {
      const res = await apiClient.adminListOrders(filter === 'all' ? undefined : filter)
      setOrders(res.items)
    } catch (e: any) {
      toast.error(e.message || 'Could not load orders')
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') load()
  }, [user, filter])

  async function updateStatus(orderId: string, status: string) {
    try {
      await apiClient.adminUpdateOrder(orderId, { status })
      toast.success(`Order marked as ${status}`)
      load()
      if (selected?.id === orderId) {
        setSelected({ ...selected, status })
      }
    } catch (e: any) {
      toast.error(e.message || 'Update failed')
    }
  }

  async function updatePayment(orderId: string, paymentStatus: string) {
    try {
      await apiClient.adminUpdateOrder(orderId, { paymentStatus })
      toast.success(`Payment marked as ${paymentStatus}`)
      load()
      if (selected?.id === orderId) {
        setSelected({ ...selected, paymentStatus })
      }
    } catch (e: any) {
      toast.error(e.message || 'Update failed')
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Orders</h1>
            <p className="text-sm text-muted-foreground">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="overflow-hidden">
          {loadingOrders ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2" />
              No orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Payment</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Placed</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(o)}
                    >
                      <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{o.deliveryName}</div>
                        <div className="text-xs text-muted-foreground">{o.user.email}</div>
                      </TableCell>
                      <TableCell className="text-center">{o.items.length}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEgp(o.totalPiasters)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={o.paymentStatus === 'paid' ? 'default' : 'outline'}>
                          {o.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{statusBadge(o.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(o.placedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Order detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Order {selected.orderNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status controls */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Order status</label>
                    <Select
                      value={selected.status}
                      onValueChange={(v) => updateStatus(selected.id, v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Payment status</label>
                    <Select
                      value={selected.paymentStatus}
                      onValueChange={(v) => updatePayment(selected.id, v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Customer + delivery */}
                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Customer</h4>
                    <div className="text-sm">{selected.deliveryName}</div>
                    <div className="text-sm text-muted-foreground">{selected.user.email}</div>
                    <div className="text-sm text-muted-foreground">{selected.deliveryPhone}</div>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Delivery address</h4>
                    <div className="text-sm">{selected.deliveryAddress}</div>
                    <div className="text-sm text-muted-foreground">
                      {selected.deliveryCity}
                      {selected.deliveryArea ? `, ${selected.deliveryArea}` : ''}
                    </div>
                    {selected.deliveryNotes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Notes: {selected.deliveryNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="pt-2 border-t">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Items</h4>
                  <div className="space-y-2">
                    {selected.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-sm">
                        <div>
                          <div className="font-medium">{it.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.quantity} × {formatEgp(it.pricePiasters)}
                            {it.unit ? ` · ${it.unit}` : ''}
                          </div>
                        </div>
                        <div className="font-medium">{formatEgp(it.lineTotalPiasters)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="pt-2 border-t space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatEgp(selected.subtotalPiasters)}</span>
                  </div>
                  {selected.discountPiasters > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Discount {selected.couponCode ? `(${selected.couponCode})` : ''}</span>
                      <span>−{formatEgp(selected.discountPiasters)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{formatEgp(selected.deliveryFeePiasters)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-1 border-t">
                    <span>Total</span>
                    <span>{formatEgp(selected.totalPiasters)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
