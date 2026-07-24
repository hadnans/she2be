'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatEgp } from '@/lib/money'
import { useAuth } from './auth-provider'
import { toast } from 'sonner'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDrawer({ open, onOpenChange }: Props) {
  const { user } = useAuth()
  const serverItems = useCartStore((s) => s.serverItems)
  const guestItems = useCartStore((s) => s.guestItems)
  const setServerItems = useCartStore((s) => s.setServerItems)
  const setGuestItems = useCartStore((s) => s.setGuestItems)
  const subtotal = useCartStore((s) => s.subtotalPiasters())
  const [updating, setUpdating] = useState<string | null>(null)

  // Combine items for display
  const allItems = user
    ? serverItems.map((it) => ({
        id: it.id,
        productId: it.productId,
        quantity: it.quantity,
        product: it.product,
      }))
    : guestItems

  async function updateQty(productId: string, currentQty: number, delta: number) {
    const newQty = currentQty + delta
    if (newQty < 1) return
    setUpdating(productId)
    try {
      if (user) {
        const { apiClient } = await import('@/lib/api')
        await apiClient.setCartItemQty(productId, newQty)
        const cart = await apiClient.getCart()
        setServerItems(cart.items as any)
      } else {
        const newItems = guestItems.map((it) =>
          it.productId === productId ? { ...it, quantity: newQty } : it
        )
        setGuestItems(newItems)
      }
    } catch (e: any) {
      toast.error(e.message || 'Could not update quantity')
    } finally {
      setUpdating(null)
    }
  }

  async function removeItem(itemId: string, productId: string) {
    try {
      if (user) {
        const { apiClient } = await import('@/lib/api')
        await apiClient.removeCartItem(itemId)
        const cart = await apiClient.getCart()
        setServerItems(cart.items as any)
      } else {
        const newItems = guestItems.filter((it) => it.productId !== productId)
        setGuestItems(newItems)
      }
      toast.success('Removed from cart')
    } catch (e: any) {
      toast.error(e.message || 'Could not remove item')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Cart
            <span className="text-sm font-normal text-muted-foreground">
              ({allItems.reduce((s, it) => s + it.quantity, 0)} items)
            </span>
          </SheetTitle>
        </SheetHeader>

        {allItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add some fresh produce to get started
              </p>
            </div>
            <Button asChild variant="outline" onClick={() => onOpenChange(false)}>
              <Link href="/">Browse products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {allItems.map((it) => (
                <div
                  key={it.productId}
                  className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {it.product.imageUrl && (
                      <img
                        src={it.product.imageUrl}
                        alt={it.product.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-2">{it.product.name}</div>
                    {it.product.unit && (
                      <div className="text-xs text-muted-foreground">{it.product.unit}</div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQty(it.productId, it.quantity, -1)}
                          disabled={updating === it.productId || it.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{it.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQty(it.productId, it.quantity, 1)}
                          disabled={updating === it.productId}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatEgp(it.product.pricePiasters * it.quantity)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => removeItem(it.id, it.productId)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatEgp(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
              <Separator />
              {user ? (
                <Button asChild className="w-full" onClick={() => onOpenChange(false)}>
                  <Link href="/checkout">
                    Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button asChild className="w-full" onClick={() => onOpenChange(false)}>
                    <Link href="/login?redirect=/checkout">Sign in to checkout</Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Your cart will be saved when you sign in
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
