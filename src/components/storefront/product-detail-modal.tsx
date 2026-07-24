'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Check, Minus, Leaf, Star, Truck, Shield } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cart'
import { useAuth } from './auth-provider'
import { formatEgp } from '@/lib/money'
import { Product } from '@/lib/api'

interface Props {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductDetailModal({ product, open, onOpenChange }: Props) {
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const { user } = useAuth()
  const guestItems = useCartStore((s) => s.guestItems)
  const setGuestItems = useCartStore((s) => s.setGuestItems)
  const setCartOpen = useCartStore((s) => s.setCartOpen)

  if (!product) return null

  const onSale = product.compareAtPricePiasters && product.compareAtPricePiasters > product.pricePiasters
  const outOfStock = product.stock <= 0
  const discountPct = onSale
    ? Math.round((1 - product.pricePiasters / product.compareAtPricePiasters!) * 100)
    : 0

  async function handleAdd() {
    if (!product || outOfStock) return
    setAdding(true)
    try {
      if (user) {
        const { apiClient } = await import('@/lib/api')
        await apiClient.addToCart(product.id, qty)
        const cart = await apiClient.getCart()
        useCartStore.getState().setServerItems(cart.items as any)
      } else {
        const existing = guestItems.find((it) => it.productId === product.id)
        const newItems = existing
          ? guestItems.map((it) =>
              it.productId === product.id ? { ...it, quantity: it.quantity + qty } : it
            )
          : [
              ...guestItems,
              {
                productId: product.id,
                quantity: qty,
                product: {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  pricePiasters: product.pricePiasters,
                  unit: product.unit,
                  imageUrl: product.imageUrl,
                  stock: product.stock,
                },
              },
            ]
        setGuestItems(newItems)
      }
      setJustAdded(true)
      setTimeout(() => {
        setJustAdded(false)
        onOpenChange(false)
        setCartOpen(true)
      }, 800)
      toast.success(`${qty} × ${product.name} added to cart`)
    } catch (e: any) {
      toast.error(e.message || 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square bg-muted">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-6xl">🛒</div>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {onSale && (
                <Badge variant="destructive" className="font-semibold">-{discountPct}%</Badge>
              )}
              {product.isOrganic && (
                <Badge className="bg-primary text-primary-foreground">
                  <Leaf className="h-3 w-3 mr-1" />
                  Organic
                </Badge>
              )}
              {product.isVegan && (
                <Badge variant="secondary">Vegan</Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col gap-4">
            <DialogHeader>
              {product.category && (
                <div className="text-xs uppercase tracking-wider text-primary font-medium">
                  {product.category.name}
                </div>
              )}
              <DialogTitle className="text-2xl leading-tight">{product.name}</DialogTitle>
              {product.brand && (
                <div className="text-sm text-muted-foreground">by {product.brand.name}</div>
              )}
            </DialogHeader>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatEgp(product.pricePiasters)}
              </span>
              {onSale && (
                <span className="text-base text-muted-foreground line-through">
                  {formatEgp(product.compareAtPricePiasters!)}
                </span>
              )}
              {product.unit && (
                <span className="text-sm text-muted-foreground">/ {product.unit}</span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            )}

            {product.longDescription && (
              <p className="text-sm text-foreground/80 leading-relaxed">
                {product.longDescription}
              </p>
            )}

            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-medium">{product.ratingAvg.toFixed(1) || 'New'}</span>
                {product.ratingCount > 0 && (
                  <span className="text-muted-foreground">({product.ratingCount})</span>
                )}
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className={`font-medium ${outOfStock ? 'text-destructive' : 'text-primary'}`}>
                {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <Truck className="h-4 w-4 text-primary" />
                <span>Same-day delivery</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-4 w-4 text-primary" />
                <span>Quality guaranteed</span>
              </div>
            </div>

            {!outOfStock && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-r-none"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-12 text-center font-medium">{qty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-l-none"
                    onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    disabled={qty >= product.stock}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleAdd}
                  disabled={adding || outOfStock}
                >
                  {justAdded ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to cart · {formatEgp(product.pricePiasters * qty)}
                    </>
                  )}
                </Button>
              </div>
            )}

            {product.sku && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                SKU: {product.sku}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
