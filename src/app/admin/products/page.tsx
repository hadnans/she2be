'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Pencil, Trash2, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient, Product } from '@/lib/api'
import { formatEgp } from '@/lib/money'
import { toast } from 'sonner'

export default function AdminProductsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login?redirect=/admin/products')
    }
  }, [user, loading, router])

  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await apiClient.adminListProducts(search || undefined)
      setProducts(res.items)
    } catch (e: any) {
      toast.error(e.message || 'Could not load products')
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      const t = setTimeout(loadProducts, search ? 300 : 0)
      return () => clearTimeout(t)
    }
  }, [user, search])

  async function toggleActive(p: Product) {
    try {
      await apiClient.adminUpdateProduct(p.id, { isActive: !p.isActive })
      setProducts((arr) =>
        arr.map((it) => (it.id === p.id ? { ...it, isActive: !p.isActive } : it))
      )
      toast.success(`${p.name} ${p.isActive ? 'hidden' : 'activated'}`)
    } catch (e: any) {
      toast.error(e.message || 'Update failed')
    }
  }

  async function toggleFeatured(p: Product) {
    try {
      await apiClient.adminUpdateProduct(p.id, { isFeatured: !p.isFeatured })
      setProducts((arr) =>
        arr.map((it) => (it.id === p.id ? { ...it, isFeatured: !p.isFeatured } : it))
      )
    } catch (e: any) {
      toast.error(e.message || 'Update failed')
    }
  }

  async function deleteProduct(p: Product) {
    try {
      await apiClient.adminDeleteProduct(p.id)
      setProducts((arr) => arr.filter((it) => it.id !== p.id))
      toast.success(`${p.name} deleted`)
    } catch (e: any) {
      toast.error(e.message || 'Delete failed')
    }
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
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} {products.length === 1 ? 'product' : 'products'} in catalog
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/new-product">
              <Plus className="h-4 w-4 mr-1" />
              Add product
            </Link>
          </Button>
        </div>

        <Card className="mb-4 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name..."
              className="pl-10 border-0 bg-muted/40"
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          {loadingProducts ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              No products found. Try adjusting your search or add a new product.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Flags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="line-clamp-1">{p.name}</div>
                        {p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.category?.name || '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEgp(p.pricePiasters)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            p.stock === 0
                              ? 'text-destructive font-medium'
                              : p.stock <= p.lowStockThreshold
                              ? 'text-amber-600 font-medium'
                              : ''
                          }
                        >
                          {p.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => toggleActive(p)} title="Toggle active">
                          <Badge variant={p.isActive ? 'default' : 'secondary'}>
                            {p.isActive ? 'Active' : 'Hidden'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => toggleFeatured(p)} title="Toggle featured">
                            <Badge
                              variant={p.isFeatured ? 'default' : 'outline'}
                              className="cursor-pointer"
                            >
                              ★
                            </Badge>
                          </button>
                          {p.isOrganic && <Badge variant="outline">Org</Badge>}
                          {p.isVegan && <Badge variant="outline">Veg</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                            <Link href={`/admin/new-product?id=${p.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{p.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will soft-delete the product. It will be hidden from the storefront but order history is preserved.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteProduct(p)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
