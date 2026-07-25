'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentSelector } from '@/components/storefront/payments/payment-selector'
import { useAuth } from '@/components/storefront/auth-provider'
import { formatEgp } from '@/lib/money'

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading } = useAuth()
  const [order, setOrder] = useState<any | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=/payment/${id}`)
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetch(`/api/orders/${id}`, { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((data) => setOrder(data))
        .catch(() => {})
        .finally(() => setLoadingOrder(false))
    }
  }, [user, id])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (loadingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <Button asChild>
            <Link href="/orders">Back to orders</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to orders
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Complete your payment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Order <span className="font-mono">#{order.orderNumber}</span>
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatEgp(order.subtotalPiasters)}</span>
          </div>
          {order.discountPiasters > 0 && (
            <div className="flex justify-between text-sm text-primary mb-2">
              <span>Discount</span>
              <span>−{formatEgp(order.discountPiasters)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Delivery</span>
            <span>{formatEgp(order.deliveryFeePiasters)}</span>
          </div>
          <div className="border-t pt-3 mt-3 flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatEgp(order.totalPiasters)}</span>
          </div>
        </Card>

        <Card className="p-6">
          <PaymentSelector
            orderId={order.id}
            amountPiasters={order.totalPiasters}
            onPaid={() => router.push(`/orders/${order.id}?paid=1`)}
          />
        </Card>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          All payments are processed securely through PCI-compliant providers.
        </div>
      </div>
    </div>
  )
}
