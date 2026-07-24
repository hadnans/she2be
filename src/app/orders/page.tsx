'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package } from 'lucide-react'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient } from '@/lib/api'
import { formatEgp } from '@/lib/money'

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
  items: Array<{
    id: string
    productName: string
    quantity: number
    pricePiasters: number
    productImageUrl: string | null
    unit: string | null
  }>
}

const STATUS_COLORS: Record<string, any> = {
  pending: 'bg-amber-100 text-amber-900',
  paid: 'bg-blue-100 text-blue-900',
  preparing: 'bg-purple-100 text-purple-900',
  out_for_delivery: 'bg-indigo-100 text-indigo-900',
  delivered: 'bg-green-100 text-green-900',
  cancelled: 'bg-red-100 text-red-900',
  refunded: 'bg-gray-100 text-gray-900',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export default function OrdersPage() {
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (user) {
      apiClient
        .listOrders()
        .then((res) => setOrders(res.items))
        .finally(() => setLoadingOrders(false))
    } else if (!loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingOrders(false)
    }
  }, [user, loading])

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-muted-foreground mb-4">You need to be signed in to view your orders.</p>
          <Button asChild>
            <Link href="/login?redirect=/orders">Sign in</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to store
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-6">Your orders</h1>

        {loadingOrders ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : orders.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-4">
              When you place your first order, it will appear here.
            </p>
            <Button asChild>
              <Link href="/">Start shopping</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                      <Badge className={STATUS_COLORS[order.status] || 'bg-gray-100'}>
                        {STATUS_LABEL[order.status] || order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Placed {new Date(order.placedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{formatEgp(order.totalPiasters)}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 text-sm">
                      <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                        {it.productImageUrl && (
                          <img src={it.productImageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{it.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.quantity} × {formatEgp(it.pricePiasters)}
                          {it.unit && ` · ${it.unit}`}
                        </div>
                      </div>
                      <div className="font-medium">{formatEgp(it.pricePiasters * it.quantity)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
