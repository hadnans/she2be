'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from './auth-provider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, User, LogOut, LayoutDashboard, Search, Menu, Leaf, Heart } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCartStore } from '@/store/cart'
import { CartDrawer } from './cart-drawer'
import { toast } from 'sonner'

interface Props {
  onSearch?: (q: string) => void
  initialQuery?: string
}

export function Header({ onSearch, initialQuery = '' }: Props) {
  const { user, logout } = useAuth()
  const [q, setQ] = useState(initialQuery)
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const itemCount = useCartStore((s) => s.itemCount())

  // Sync cart count from server when user logs in
  useEffect(() => {
    if (user) {
      import('@/lib/api').then(({ apiClient }) => {
        apiClient.getCart().then((cart) => {
          useCartStore.getState().setServerItems(cart.items as any)
        }).catch(() => {})
      })
    } else {
      useCartStore.getState().setServerItems([])
    }
  }, [user])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    onSearch?.(q)
    setMobileOpen(false)
  }

  async function handleLogout() {
    await logout()
    toast.success('Signed out')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-3 md:gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-semibold text-base tracking-tight">She2Be</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Premium Grocery
              </span>
            </div>
          </Link>

          {/* Search (desktop) */}
          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for products, categories, brands..."
                className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                aria-label="Search products"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 md:gap-2 ml-auto">
            {user?.role === 'admin' && (
              <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                <Link href="/admin">
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  Admin
                </Link>
              </Button>
            )}

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${itemCount} items`}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Button>

            {/* Wishlist (only when signed in) */}
            {user && (
              <Button asChild variant="ghost" size="icon" aria-label="Open wishlist">
                <Link href="/wishlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
            )}

            {/* User menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account menu">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.name || user.email}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                      {user.role === 'admin' && (
                        <Badge className="mt-1 w-fit" variant="secondary">Admin</Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin Console
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="hidden sm:flex">
                <Link href="/login">Sign in</Link>
              </Button>
            )}

            {/* Mobile menu toggle */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6 space-y-4">
                  <form onSubmit={submitSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search..."
                        className="pl-10"
                      />
                    </div>
                  </form>
                  <div className="space-y-1">
                    {user ? (
                      <>
                        <div className="px-2 py-2 text-sm">
                          <div className="font-medium">{user.name || 'Account'}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        {user.role === 'admin' && (
                          <Button asChild variant="ghost" className="w-full justify-start">
                            <Link href="/admin" onClick={() => setMobileOpen(false)}>
                              <LayoutDashboard className="mr-2 h-4 w-4" />
                              Admin Console
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" className="w-full justify-start" onClick={async () => { await handleLogout(); setMobileOpen(false); }}>
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button asChild className="w-full">
                          <Link href="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                          <Link href="/register" onClick={() => setMobileOpen(false)}>Create account</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Search (mobile) */}
        <form onSubmit={submitSearch} className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              className="pl-10 bg-muted/50 border-0"
              aria-label="Search products"
            />
          </div>
        </form>
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  )
}
