/**
 * Cart store — synced to the server for logged-in users, falls back to
 * localStorage for guests.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartLineItem {
  id: string
  productId: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    pricePiasters: number
    unit: string | null
    imageUrl: string | null
    stock: number
  }
}

interface GuestItem {
  productId: string
  quantity: number
  product: CartLineItem['product']
}

interface CartState {
  serverItems: CartLineItem[]
  guestItems: GuestItem[]
  isCartOpen: boolean
  isLoading: boolean
  setCartOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void
  setServerItems: (items: CartLineItem[]) => void
  setGuestItems: (items: GuestItem[]) => void
  clearAll: () => void
  subtotalPiasters: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      serverItems: [],
      guestItems: [],
      isCartOpen: false,
      isLoading: false,
      setCartOpen: (open) => set({ isCartOpen: open }),
      setLoading: (loading) => set({ isLoading: loading }),
      setServerItems: (items) => set({ serverItems: items }),
      setGuestItems: (items) => set({ guestItems: items }),
      clearAll: () => set({ serverItems: [], guestItems: [] }),
      subtotalPiasters: () => {
        const { serverItems, guestItems } = get()
        return (
          serverItems.reduce((s, it) => s + it.product.pricePiasters * it.quantity, 0) +
          guestItems.reduce((s, it) => s + it.product.pricePiasters * it.quantity, 0)
        )
      },
      itemCount: () => {
        const { serverItems, guestItems } = get()
        return (
          serverItems.reduce((s, it) => s + it.quantity, 0) +
          guestItems.reduce((s, it) => s + it.quantity, 0)
        )
      },
    }),
    {
      name: 'she2be-cart',
      partialize: (state) => ({ guestItems: state.guestItems }),
    }
  )
)
