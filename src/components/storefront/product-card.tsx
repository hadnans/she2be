'use client'

import { Product } from '@/lib/api'
import { formatEgp } from '@/lib/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cart'
import { useAuth } from './auth-provider'

interface Props {
  product: Product
  onView?: (product: Product) => void
}

export function ProductCard({ product, onView }: Props) {
  const [adding, setAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const { user } = useAuth()
  const addGuestItem = useCartStore((s) => s.setGuestItems)
  const guestItems = useCartStore((s) => s.guestItems)
  const setCartOpen = useCartStore((s) => s.setCartOpen)

  const onSale = product.compareAtPricePiasters && product.compareAtPricePiasters > product.pricePiasters
  const discountPct = onSale
    ? Math.round((1 - product.pricePiasters / product.compareAtPricePiasters!) * 100)
    : 0
  const outOfStock = product.stock <= 0

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (outOfStock) return
    setAdding(true)
    try {
      if (user) {
        const { apiClient } = await import('@/lib/api')
        await apiClient.addToCart(product.id, 1)
        // Refresh cart from server
        const cart = await apiClient.getCart()
        useCartStore.getState().setServerItems(cart.items as any)
      } else {
        // Guest: add to local store
        const existing = guestItems.find((it) => it.productId === product.id)
        const newItems = existing
          ? guestItems.map((it) =>
              it.productId === product.id ? { ...it, quantity: it.quantity + 1 } : it
            )
          : [
              ...guestItems,
              {
                productId: product.id,
                quantity: 1,
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
        addGuestItem(newItems)
      }
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 1200)
      toast.success(`${product.name} added to cart`)
    } catch (e: any) {
      toast.error(e.message || 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card
      className="product-card-hover group relative overflow-hidden p-0 cursor-pointer h-full flex flex-col"
      onClick={() => onView?.(product)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <span className="text-4xl">🛒</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {onSale && (
            <Badge variant="destructive" className="font-semibold">
              -{discountPct}%
            </Badge>
          )}
          {product.isOrganic && (
            <Badge className="bg-primary/90 text-primary-foreground">Organic</Badge>
          )}
          {product.isFeatured && !onSale && (
            <Badge className="bg-accent text-accent-foreground">Featured</Badge>
          )}
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Badge variant="secondary" className="text-sm">Out of stock</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        {product.category && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {product.category.name}
          </div>
        )}
        <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.unit && (
          <div className="text-xs text-muted-foreground">{product.unit}</div>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            {onSale && (
              <span className="text-xs text-muted-foreground line-through">
                {formatEgp(product.compareAtPricePiasters!)}
              </span>
            )}
            <span className="font-semibold text-foreground">
              {formatEgp(product.pricePiasters)}
            </span>
          </div>
          <Button
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            disabled={adding || outOfStock}
            onClick={handleAdd}
            aria-label={`Add ${product.name} to cart`}
          >
            {justAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  )
}
