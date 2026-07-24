'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Tag, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient } from '@/lib/api'
import { useCartStore } from '@/store/cart'
import { formatEgp } from '@/lib/money'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const serverItems = useCartStore((s) => s.serverItems)
  const setServerItems = useCartStore((s) => s.setServerItems)

  const [form, setForm] = useState({
    deliveryName: '',
    deliveryPhone: '',
    deliveryAddress: '',
    deliveryCity: 'Cairo',
    deliveryArea: '',
    deliveryNotes: '',
    couponCode: '',
  })
  const [discount, setDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [placing, setPlacing] = useState(false)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  const subtotal = serverItems.reduce(
    (s, it) => s + it.product.pricePiasters * it.quantity,
    0
  )
  const deliveryFee = subtotal >= 20000 ? 0 : 3500 // free over 200 EGP
  const total = subtotal - discount + deliveryFee

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/checkout')
    } else if (user) {
      setForm((f) => ({
        ...f,
        deliveryName: user.name || '',
        deliveryPhone: user.phone || '',
      }))
      // Load fresh cart from server (the Header's effect may have already
      // run, but we want to make sure we have the latest items).
      apiClient.getCart().then((cart) => {
        setServerItems(cart.items as any)
      }).catch(() => {})
    }
  }, [user, authLoading, router, setServerItems])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (serverItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-4">Add items before checking out.</p>
          <Button asChild>
            <Link href="/">Browse products</Link>
          </Button>
        </Card>
      </div>
    )
  }

  async function applyCoupon() {
    if (!form.couponCode.trim()) return
    setValidatingCoupon(true)
    try {
      const res = await apiClient.validateCoupon(form.couponCode, subtotal)
      setDiscount(res.discountPiasters)
      setAppliedCoupon(res.code)
      toast.success(`Coupon applied: ${res.description || res.code}`)
    } catch (e: any) {
      setDiscount(0)
      setAppliedCoupon('')
      toast.error(e.message || 'Invalid coupon')
    } finally {
      setValidatingCoupon(false)
    }
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    setPlacing(true)
    try {
      const order = await apiClient.placeOrder({
        ...form,
        couponCode: appliedCoupon || undefined,
        deliveryFeePiasters: deliveryFee,
      })
      // Refresh cart
      const cart = await apiClient.getCart()
      setServerItems(cart.items as any)
      toast.success(`Order placed! #${order.orderNumber}`)
      router.push('/orders')
    } catch (e: any) {
      toast.error(e.message || 'Could not place order')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to store
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={placeOrder}>
              <Card>
                <CardHeader>
                  <CardTitle>Delivery details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name *</Label>
                      <Input
                        id="name" required
                        value={form.deliveryName}
                        onChange={(e) => setForm({ ...form, deliveryName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone" required
                        value={form.deliveryPhone}
                        onChange={(e) => setForm({ ...form, deliveryPhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addr">Street address *</Label>
                    <Input
                      id="addr" required
                      placeholder="Building, street, apartment..."
                      value={form.deliveryAddress}
                      onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city" required
                        value={form.deliveryCity}
                        onChange={(e) => setForm({ ...form, deliveryCity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="area">Area / District</Label>
                      <Input
                        id="area"
                        value={form.deliveryArea}
                        onChange={(e) => setForm({ ...form, deliveryArea: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Delivery notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Landmark, gate code, preferred time..."
                      value={form.deliveryNotes}
                      onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-md border-2 border-primary/30 bg-primary/5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Cash on delivery</div>
                      <div className="text-xs text-muted-foreground">Pay when your order arrives</div>
                    </div>
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Online payment coming soon. For now, all orders are cash-on-delivery.
                  </p>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full mt-4" disabled={placing}>
                {placing ? 'Placing order...' : `Place order · ${formatEgp(total)}`}
              </Button>
            </form>
          </div>

          {/* Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {serverItems.map((it) => (
                    <div key={it.id} className="flex gap-2 text-sm">
                      <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                        {it.product.imageUrl && (
                          <img src={it.product.imageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="line-clamp-1 font-medium">{it.product.name}</div>
                        <div className="text-xs text-muted-foreground">×{it.quantity}</div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatEgp(it.product.pricePiasters * it.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Coupon */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={form.couponCode}
                    onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                    disabled={!!appliedCoupon}
                  />
                  {appliedCoupon ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAppliedCoupon('')
                        setDiscount(0)
                        setForm({ ...form, couponCode: '' })
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={applyCoupon}
                      disabled={validatingCoupon || !form.couponCode}
                    >
                      <Tag className="h-3.5 w-3.5 mr-1" />
                      Apply
                    </Button>
                  )}
                </div>
                {appliedCoupon && (
                  <Badge variant="secondary" className="w-fit">
                    {appliedCoupon} applied
                  </Badge>
                )}

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatEgp(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Discount</span>
                      <span>−{formatEgp(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{deliveryFee === 0 ? 'Free' : formatEgp(deliveryFee)}</span>
                  </div>
                  {deliveryFee === 0 && (
                    <div className="text-xs text-primary">🎉 You got free delivery!</div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatEgp(total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
