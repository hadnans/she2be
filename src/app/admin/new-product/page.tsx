'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient, Category } from '@/lib/api'
import { egpToPiasters, piastersToEgp } from '@/lib/money'

function NewProductForm() {
  const router = useRouter()
  const params = useSearchParams()
  const editId = params.get('id')
  const { user, loading } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(!!editId)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    longDescription: '',
    priceEgp: '',
    compareAtPriceEgp: '',
    costEgp: '',
    unit: '',
    sku: '',
    barcode: '',
    stock: '0',
    lowStockThreshold: '5',
    isActive: true,
    isFeatured: false,
    isOrganic: false,
    isVegan: false,
    categoryId: '',
    brandId: '',
    imageUrl: '',
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login?redirect=/admin/new-product')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user?.role === 'admin') {
      apiClient.listCategories().then((res) => {
        setCategories(res.items)
        if (res.items[0] && !editId) {
          setForm((f) => ({ ...f, categoryId: res.items[0].id }))
        }
      })
      if (editId) {
        apiClient
          .adminListProducts()
          .then((res) => {
            const p = res.items.find((it) => it.id === editId)
            if (!p) {
              toast.error('Product not found')
              router.push('/admin/products')
              return
            }
            setForm({
              name: p.name,
              slug: p.slug,
              description: p.description || '',
              longDescription: p.longDescription || '',
              priceEgp: piastersToEgp(p.pricePiasters).toString(),
              compareAtPriceEgp: p.compareAtPricePiasters ? piastersToEgp(p.compareAtPricePiasters).toString() : '',
              costEgp: p.costPiasters ? piastersToEgp(p.costPiasters).toString() : '',
              unit: p.unit || '',
              sku: p.sku || '',
              barcode: p.barcode || '',
              stock: p.stock.toString(),
              lowStockThreshold: p.lowStockThreshold.toString(),
              isActive: p.isActive,
              isFeatured: p.isFeatured,
              isOrganic: p.isOrganic,
              isVegan: p.isVegan,
              categoryId: p.categoryId,
              brandId: p.brandId || '',
              imageUrl: p.imageUrl || '',
            })
          })
          .finally(() => setLoadingProduct(false))
      }
    }
  }, [user, editId, router])

  function slugify(s: string) {
    return s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60)
  }

  function onNameChange(v: string) {
    setForm((f) => ({
      ...f,
      name: v,
      slug: f.slug || slugify(v),
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.categoryId) {
      toast.error('Please select a category')
      return
    }
    if (!form.name || !form.slug) {
      toast.error('Name and slug are required')
      return
    }
    const pricePiasters = egpToPiasters(Number(form.priceEgp) || 0)
    if (pricePiasters <= 0) {
      toast.error('Price must be greater than 0')
      return
    }

    setSaving(true)
    const payload: any = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      longDescription: form.longDescription || null,
      pricePiasters,
      compareAtPricePiasters: form.compareAtPriceEgp ? egpToPiasters(Number(form.compareAtPriceEgp)) : null,
      costPiasters: form.costEgp ? egpToPiasters(Number(form.costEgp)) : null,
      unit: form.unit || null,
      sku: form.sku || null,
      barcode: form.barcode || null,
      stock: Number(form.stock) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 5,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      isOrganic: form.isOrganic,
      isVegan: form.isVegan,
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      imageUrl: form.imageUrl || null,
    }

    try {
      if (editId) {
        await apiClient.adminUpdateProduct(editId, payload)
        toast.success('Product updated')
      } else {
        await apiClient.adminCreateProduct(payload)
        toast.success('Product created')
      }
      router.push('/admin/products')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user || loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-4xl px-4 md:px-8 py-6 md:py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to products
          </Link>
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">
          {editId ? 'Edit product' : 'Add new product'}
        </h1>

        <form onSubmit={submit} className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  required
                  placeholder="e.g. Organic Bananas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  placeholder="organic-bananas"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Used in the URL. Lowercase, hyphenated.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Short description</Label>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="A brief, punchy description shown on product cards."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longDesc">Long description</Label>
                <Textarea
                  id="longDesc"
                  value={form.longDescription}
                  onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
                  placeholder="Detailed description shown on the product page."
                  rows={4}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) => setForm({ ...form, categoryId: v })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit (display)</Label>
                  <Input
                    id="unit"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="e.g. 500g, 1L, pack of 4"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing &amp; inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (EGP) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.priceEgp}
                    onChange={(e) => setForm({ ...form, priceEgp: e.target.value })}
                    required
                    placeholder="35.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compare">Compare-at price (EGP)</Label>
                  <Input
                    id="compare"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.compareAtPriceEgp}
                    onChange={(e) => setForm({ ...form, compareAtPriceEgp: e.target.value })}
                    placeholder="Optional — shows a strikethrough"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost (EGP)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.costEgp}
                    onChange={(e) => setForm({ ...form, costEgp: e.target.value })}
                    placeholder="Internal cost (admin only)"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowstock">Low-stock threshold</Label>
                  <Input
                    id="lowstock"
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="Internal stock code"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode (EAN/UPC)</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  {form.imageUrl && (
                    <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                      <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a direct image URL. For now, this is the only way to add an image —
                  file upload coming in a future phase.
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <ImageIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Tip:</strong> Use square images
                  (e.g. 600×600) from Unsplash, Pexels, or your own CDN. For example:
                  <code className="mx-1 px-1 py-0.5 bg-background rounded">https://images.unsplash.com/photo-XXX?w=600</code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flags */}
          <Card>
            <CardHeader>
              <CardTitle>Display &amp; flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v === true })}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Active (visible on storefront)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={form.isFeatured}
                  onCheckedChange={(v) => setForm({ ...form, isFeatured: v === true })}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Featured (shown on homepage)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="organic"
                  checked={form.isOrganic}
                  onCheckedChange={(v) => setForm({ ...form, isOrganic: v === true })}
                />
                <Label htmlFor="organic" className="cursor-pointer">
                  Organic
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vegan"
                  checked={form.isVegan}
                  onCheckedChange={(v) => setForm({ ...form, isVegan: v === true })}
                />
                <Label htmlFor="vegan" className="cursor-pointer">
                  Vegan
                </Label>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex flex-wrap gap-3 justify-end pb-8">
            <Button asChild variant="outline">
              <Link href="/admin/products">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : editId ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
      <NewProductForm />
    </Suspense>
  )
}
