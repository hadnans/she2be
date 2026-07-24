'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Heart, Trash2, ShoppingBag, ArrowLeft, Plus } from 'lucide-react'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient } from '@/lib/api'
import { formatEgp } from '@/lib/money'
import { toast } from 'sonner'

interface WishlistItem {
  id: string
  productId: string
  product: {
    id: string
    name: string
    slug: string
    pricePiasters: number
    unit: string | null
    imageUrl: string | null
    stock: number
    isActive: boolean
    category?: { name: string } | null
  }
}

export default function WishlistPage() {
  const { user, loading } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (user) {
        apiClient
          .getWishlist()
          .then((w) => setItems(w.items))
          .catch(() => toast.error('Could not load wishlist'))
          .finally(() => setLoadingItems(false))
      } else {
        setLoadingItems(false)
      }
    }
  }, [user, loading])

  async function remove(itemId: string) {
    try {
      await apiClient.removeFromWishlist(itemId)
      setItems((arr) => arr.filter((it) => it.id !== itemId))
      toast.success('Removed from wishlist')
    } catch (e: any) {
      toast.error(e.message || 'Could not remove')
    }
  }

  async function addToCart(item: WishlistItem) {
    try {
      await apiClient.addToCart(item.productId, 1)
      const cart = await apiClient.getCart()
      // Update cart store
      const { useCartStore } = await import('@/store/cart')
      useCartStore.getState().setServerItems(cart.items as any)
      useCartStore.getState().setCartOpen(true)
      toast.success(`${item.product.name} added to cart`)
    } catch (e: any) {
      toast.error(e.message || 'Could not add to cart')
    }
  }

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view your wishlist</h2>
          <p className="text-muted-foreground mb-4">
            Save items you love and find them here later.
          </p>
          <Button asChild>
            <Link href="/login?redirect=/wishlist">Sign in</Link>
          </Button>
        </Card>
      </div>
    )
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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Your Wishlist</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>

        {loadingItems ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-4">
              Tap the heart icon on any product to save it for later.
            </p>
            <Button asChild>
              <Link href="/">Browse products</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => {
              const outOfStock = it.product.stock <= 0 || !it.product.isActive
              return (
                <Card key={it.id} className="p-3 flex gap-3">
                  <div className="h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {it.product.imageUrl && (
                      <img
                        src={it.product.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    {it.product.category && (
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {it.product.category.name}
                      </div>
                    )}
                    <div className="font-medium text-sm line-clamp-2">{it.product.name}</div>
                    {it.product.unit && (
                      <div className="text-xs text-muted-foreground">{it.product.unit}</div>
                    )}
                    <div className="font-semibold text-sm mt-1">
                      {formatEgp(it.product.pricePiasters)}
                    </div>
                    {outOfStock && (
                      <Badge variant="secondary" className="w-fit mt-1">Out of stock</Badge>
                    )}
                    <div className="mt-auto pt-2 flex gap-1">
                      <Button
                        size="sm"
                        className="flex-1 h-8"
                        disabled={outOfStock}
                        onClick={() => addToCart(it)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(it.id)}
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
