'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OrderTrackingMap } from '@/components/storefront/maps/order-tracking-map'
import { useAuth } from '@/components/storefront/auth-provider'

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading } = useAuth()

  if (!loading && !user) {
    router.push(`/login?redirect=/order-tracking/${id}`)
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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to orders
          </Link>
        </Button>

        <div className="flex items-center gap-2 mb-6">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Track your order</h1>
        </div>

        <Card className="p-6">
          <OrderTrackingMap orderId={id} />
        </Card>
      </div>
    </div>
  )
}
