'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Leaf,
  Plus,
  Menu as MenuIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient } from '@/lib/api'
import { formatEgp, piastersToEgp } from '@/lib/money'
import { toast } from 'sonner'

interface AdminStats {
  totalProducts: number
  activeProducts: number
  lowStockCount: number
  totalCategories: number
  totalOrders: number
  pendingOrders: number
  totalCustomers: number
  revenuePiasters: number
  recentOrders: any[]
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      toast.error('Admin access required')
      router.push('/login?redirect=/admin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user?.role === 'admin') {
      apiClient
        .adminStats()
        .then(setStats)
        .catch((e) => toast.error(e.message || 'Could not load stats'))
        .finally(() => setStatsLoading(false))
    }
  }, [user])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-card">
        <AdminSidebar user={user} onLogout={logout} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-50">
            <MenuIcon className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <AdminSidebar user={user} onLogout={logout} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b bg-card px-4 md:px-8 py-4 md:py-5 flex items-center justify-between pl-16 md:pl-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Welcome back, {user.name || user.email}</p>
          </div>
          <Button asChild size="sm">
            <Link href="/admin/products">
              <Plus className="h-4 w-4 mr-1" />
              Manage products
            </Link>
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-8 space-y-6 overflow-auto">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              title="Total revenue"
              value={stats ? formatEgp(stats.revenuePiasters) : null}
              loading={statsLoading}
              accent="primary"
            />
            <StatCard
              title="Total orders"
              value={stats ? stats.totalOrders.toString() : null}
              sub={stats ? `${stats.pendingOrders} pending` : null}
              loading={statsLoading}
            />
            <StatCard
              title="Products"
              value={stats ? stats.totalProducts.toString() : null}
              sub={stats ? `${stats.activeProducts} active` : null}
              loading={statsLoading}
            />
            <StatCard
              title="Low stock"
              value={stats ? stats.lowStockCount.toString() : null}
              loading={statsLoading}
              accent={stats && stats.lowStockCount > 0 ? 'destructive' : 'default'}
            />
          </div>

          {/* Quick actions */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAction
              href="/admin/products"
              icon={Package}
              title="Products"
              desc="Add, edit, and manage your catalog"
            />
            <QuickAction
              href="/admin/orders"
              icon={ShoppingCart}
              title="Orders"
              desc="View and update customer orders"
            />
            <QuickAction
              href="/admin/categories"
              icon={FolderTree}
              title="Categories"
              desc="Organize products into categories"
            />
            <QuickAction
              href="/admin/new-product"
              icon={Plus}
              title="Add product"
              desc="Create a new product listing"
              highlight
            />
          </div>

          {/* Recent orders */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent orders</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/orders">View all</Link>
              </Button>
            </div>
            {statsLoading ? (
              <Skeleton className="h-32" />
            ) : stats && stats.recentOrders.length > 0 ? (
              <div className="space-y-2">
                {stats.recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-md bg-muted/40">
                    <div>
                      <div className="font-medium text-sm">#{o.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.placedAt).toLocaleString()} · {o.items.length} items
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">{o.status}</Badge>
                      <div className="font-semibold text-sm">{formatEgp(o.totalPiasters)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}

function AdminSidebar({
  user,
  onLogout,
}: {
  user: { email: string; name: string | null }
  onLogout: () => Promise<void>
}) {
  const items = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', active: true },
    { href: '/admin/products', icon: Package, label: 'Products' },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
    { href: '/admin/categories', icon: FolderTree, label: 'Categories' },
    { href: '/admin/new-product', icon: Plus, label: 'Add product' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-base">She2Be</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => (
          <Button
            key={it.href}
            asChild
            variant={it.active ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <Link href={it.href}>
              <it.icon className="mr-2 h-4 w-4" />
              {it.label}
            </Link>
          </Button>
        ))}
        <div className="pt-2 mt-2 border-t">
          <Button variant="ghost" className="w-full justify-start" disabled>
            <Users className="mr-2 h-4 w-4" />
            Customers
          </Button>
          <Button variant="ghost" className="w-full justify-start" disabled>
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button variant="ghost" className="w-full justify-start" disabled>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </nav>

      <div className="p-3 border-t">
        <div className="px-2 py-2 text-xs">
          <div className="font-medium truncate">{user.name || user.email}</div>
          <div className="text-muted-foreground truncate">{user.email}</div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={async () => {
            await onLogout()
            window.location.href = '/'
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  sub,
  loading,
  accent = 'default',
}: {
  title: string
  value: string | null
  sub?: string | null
  loading: boolean
  accent?: 'default' | 'primary' | 'destructive'
}) {
  return (
    <Card className="p-4 md:p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {title}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24 mt-2" />
      ) : (
        <div
          className={`text-2xl md:text-3xl font-bold mt-1 ${
            accent === 'primary'
              ? 'text-primary'
              : accent === 'destructive'
              ? 'text-destructive'
              : ''
          }`}
        >
          {value}
        </div>
      )}
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  )
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
  highlight,
}: {
  href: string
  icon: any
  title: string
  desc: string
  highlight?: boolean
}) {
  return (
    <Link href={href}>
      <Card
        className={`p-5 h-full transition-all hover:shadow-md hover:-translate-y-0.5 ${
          highlight ? 'border-primary bg-primary/5' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0 ${
            highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">{desc}</div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
