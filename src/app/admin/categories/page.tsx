'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient, Category } from '@/lib/api'
import { toast } from 'sonner'

export default function AdminCategoriesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '🛒',
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login?redirect=/admin/categories')
    }
  }, [user, loading, router])

  const load = async () => {
    setLoadingCats(true)
    try {
      const res = await apiClient.listCategories()
      setCategories(res.items)
    } finally {
      setLoadingCats(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') load()
  }, [user])

  function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.slug) {
      toast.error('Name and slug required')
      return
    }
    setSaving(true)
    try {
      await apiClient.createCategory({
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        icon: form.icon || null,
        isActive: true,
        sortOrder: categories.length,
      })
      toast.success('Category created')
      setForm({ name: '', slug: '', description: '', icon: '🛒' })
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Could not create category')
    } finally {
      setSaving(false)
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
      <div className="mx-auto max-w-4xl px-4 md:px-8 py-6 md:py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Categories</h1>
            <p className="text-sm text-muted-foreground">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4 mr-1" />
            New category
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>New category</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cname">Name *</Label>
                    <Input
                      id="cname"
                      value={form.name}
                      onChange={(e) => setForm({
                        ...form,
                        name: e.target.value,
                        slug: form.slug || slugify(e.target.value),
                      })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cslug">Slug *</Label>
                    <Input
                      id="cslug"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                      required
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cicon">Icon (emoji)</Label>
                  <Input
                    id="cicon"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="🛒"
                    maxLength={4}
                    className="max-w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cdesc">Description</Label>
                  <Textarea
                    id="cdesc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Saving...' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loadingCats ? (
          <Card className="p-8 text-center text-muted-foreground">Loading...</Card>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{c.icon || '🛒'}</div>
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.slug}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {c.description}
                        </div>
                      )}
                      <Badge variant="outline" className="mt-2">
                        {c._count?.products ?? 0} products
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
