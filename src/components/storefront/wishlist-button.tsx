'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from './auth-provider'
import { apiClient } from '@/lib/api'

interface Props {
  productId: string
  variant?: 'icon' | 'full'
}

export function WishlistButton({ productId, variant = 'icon' }: Props) {
  const { user } = useAuth()
  const [inWishlist, setInWishlist] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    apiClient
      .getWishlist()
      .then((w) => {
        setInWishlist(w.items.some((it: any) => it.productId === productId))
      })
      .catch(() => {})
  }, [user, productId])

  async function toggle() {
    if (!user) {
      toast.info('Sign in to save items to your wishlist')
      return
    }
    setLoading(true)
    try {
      if (inWishlist) {
        const w = await apiClient.getWishlist()
        const item = w.items.find((it: any) => it.productId === productId)
        if (item) {
          await apiClient.removeFromWishlist(item.id)
        }
        setInWishlist(false)
        toast.success('Removed from wishlist')
      } else {
        await apiClient.addToWishlist(productId)
        setInWishlist(true)
        toast.success('Saved to wishlist')
      }
    } catch (e: any) {
      toast.error(e.message || 'Could not update wishlist')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        disabled={loading}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            inWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground'
          }`}
        />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={toggle}
      disabled={loading}
      className="w-full"
    >
      <Heart
        className={`h-4 w-4 mr-2 transition-colors ${
          inWishlist ? 'fill-destructive text-destructive' : ''
        }`}
      />
      {inWishlist ? 'Saved' : 'Save to wishlist'}
    </Button>
  )
}
