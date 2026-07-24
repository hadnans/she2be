'use client'

import { useEffect, useState, useCallback } from 'react'
import { AuthProvider } from '@/components/storefront/auth-provider'
import { Header } from '@/components/storefront/header'
import { Footer } from '@/components/storefront/footer'
import { ProductCard } from '@/components/storefront/product-card'
import { ProductDetailModal } from '@/components/storefront/product-detail-modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient, Product, Category } from '@/lib/api'
import { formatEgp } from '@/lib/money'
import {
  Truck,
  Shield,
  Clock,
  Leaf,
  ChevronRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

export default function Home() {
  return <Storefront />
}

function Storefront() {
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [organic, setOrganic] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Product | null>(null)

  // Initial load
  useEffect(() => {
    Promise.all([
      apiClient.listCategories(),
      apiClient.listProducts({ featured: true, pageSize: 8 }),
      apiClient.listProducts({ sort: 'newest', pageSize: 8 }),
      apiClient.listProducts({ organic: true, pageSize: 4 }),
    ])
      .then(([cats, feat, newest, org]) => {
        setCategories(cats.items)
        setFeatured(feat.items)
        setNewArrivals(newest.items)
        setOrganic(org.items)
      })
      .finally(() => setLoading(false))
  }, [])

  // Load category products when a category is selected
  useEffect(() => {
    let cancelled = false
    if (!activeCategory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryProducts([])
      return
    }
    apiClient
      .listProducts({ category: activeCategory, pageSize: 12 })
      .then((res) => {
        if (!cancelled) setCategoryProducts(res.items)
      })
    return () => { cancelled = true }
  }, [activeCategory])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([])
      return
    }
    const t = setTimeout(() => {
      apiClient
        .listProducts({ q: searchQuery, pageSize: 24 })
        .then((res) => setSearchResults(res.items))
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onSearch={setSearchQuery} initialQuery={searchQuery} />

      <main className="flex-1">
        {/* Search results override */}
        {searchQuery ? (
          <SearchResults
            query={searchQuery}
            results={searchResults}
            onView={setSelected}
            onClear={() => setSearchQuery('')}
          />
        ) : (
          <>
            {/* Hero */}
            <HeroSection />

            {/* Value props */}
            <ValueProps />

            {/* Categories */}
            <section id="categories" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <SectionHeading
                eyebrow="Browse"
                title="Shop by Category"
                description="Everything you need, organized the way you shop"
              />
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {categories.map((cat) => (
                    <CategoryTile
                      key={cat.id}
                      category={cat}
                      active={activeCategory === cat.slug}
                      onClick={() =>
                        setActiveCategory(activeCategory === cat.slug ? null : cat.slug)
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Category products (if a category is selected) */}
            {activeCategory && (
              <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">
                    {categories.find((c) => c.slug === activeCategory)?.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveCategory(null)}
                  >
                    Clear filter
                  </Button>
                </div>
                <ProductGrid products={categoryProducts} loading={false} onView={setSelected} />
              </section>
            )}

            {/* Featured */}
            <section id="featured" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <SectionHeading
                eyebrow="Hand-picked"
                title="Featured This Week"
                description="Our team's favorite picks — fresh, seasonal, and on offer"
                icon={<Sparkles className="h-4 w-4" />}
              />
              <ProductGrid products={featured} loading={loading} onView={setSelected} />
            </section>

            {/* Promo banner */}
            <PromoBanner />

            {/* New arrivals */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <SectionHeading
                eyebrow="Just landed"
                title="New Arrivals"
                description="The freshest additions to our shelves"
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <ProductGrid products={newArrivals} loading={loading} onView={setSelected} />
            </section>

            {/* Organic */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <SectionHeading
                eyebrow="Pure & natural"
                title="Organic Selection"
                description="Certified organic products, grown without compromise"
                icon={<Leaf className="h-4 w-4" />}
              />
              <ProductGrid products={organic} loading={loading} onView={setSelected} />
            </section>

            {/* Newsletter */}
            <NewsletterSection />
          </>
        )}
      </main>

      <Footer />

      <ProductDetailModal
        product={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="grocery-hero-gradient relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <Badge variant="secondary" className="rounded-full">
              <Leaf className="h-3 w-3 mr-1" />
              Farm fresh, delivered today
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Premium groceries,
              <br />
              <span className="text-primary">delivered fresh.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Hand-picked produce, pantry staples, and household essentials — sourced from local farms and trusted brands, delivered to your door in hours.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#categories">Start shopping</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#featured">View featured</a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                Same-day delivery
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                Quality guaranteed
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" />
                Free delivery over 200 EGP
              </span>
            </div>
          </div>

          <div className="hidden md:block relative">
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=70"
                  alt="Fresh produce"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted mt-6">
                <img
                  src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=400&q=70"
                  alt="Artisan bread"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=70"
                  alt="Dairy products"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted -mt-6">
                <img
                  src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=70"
                  alt="Fresh fruit"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ValueProps() {
  const items = [
    { icon: Clock, title: 'Same-day delivery', desc: 'Order before 2pm, get it today' },
    { icon: Leaf, title: 'Farm fresh', desc: 'Direct from local farms' },
    { icon: Shield, title: 'Quality promise', desc: 'Not happy? We refund, no questions' },
    { icon: Truck, title: 'Free delivery', desc: 'On orders over 200 EGP' },
  ]
  return (
    <section className="border-y border-border/60 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((it) => (
            <div key={it.title} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <it.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">{it.title}</div>
                <div className="text-xs text-muted-foreground">{it.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string
  title: string
  description?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
          {icon}
          {eyebrow}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
    </div>
  )
}

function CategoryTile({
  category,
  active,
  onClick,
}: {
  category: Category
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative aspect-square rounded-2xl border-2 transition-all overflow-hidden ${
        active
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-primary/40 hover:bg-secondary/40'
      }`}
      aria-pressed={active}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
          />
        ) : (
          <div className="text-4xl">{category.icon || '🛒'}</div>
        )}
        <div className="relative text-center">
          <div className="font-semibold text-sm leading-tight">{category.name}</div>
          {category._count && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {category._count.products} items
            </div>
          )}
        </div>
      </div>
      {active && (
        <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
      )}
    </button>
  )
}

function ProductGrid({
  products,
  loading,
  onView,
}: {
  products: Product[]
  loading: boolean
  onView: (p: Product) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    )
  }
  if (products.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No products found.
      </Card>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onView={onView} />
      ))}
    </div>
  )
}

function PromoBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="p-8 md:p-12 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-3">
              Limited time
            </Badge>
            <h3 className="text-3xl md:text-4xl font-bold mb-3">
              10% off your first order
            </h3>
            <p className="text-primary-foreground/80 mb-5 max-w-md">
              Use code <span className="font-mono font-bold bg-primary-foreground/15 px-2 py-0.5 rounded">WELCOME10</span> at checkout. Fresh savings on your first grocery delivery.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <a href="#featured">
                Shop now
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="text-8xl">🛍️</div>
          </div>
        </div>
      </Card>
    </section>
  )
}

function NewsletterSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-8 md:p-10 text-center bg-secondary/40 border-0">
        <h3 className="text-2xl font-bold mb-2">Fresh deals, every week</h3>
        <p className="text-muted-foreground mb-5 max-w-md mx-auto">
          Subscribe to our newsletter for weekly specials, new arrivals, and seasonal recipe inspiration.
        </p>
        <form
          className="flex gap-2 max-w-md mx-auto"
          onSubmit={(e) => {
            e.preventDefault()
            alert('Thanks for subscribing!')
          }}
        >
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 px-4 py-2 rounded-md border bg-background"
            required
          />
          <Button type="submit">Subscribe</Button>
        </form>
      </Card>
    </section>
  )
}

function SearchResults({
  query,
  results,
  onView,
  onClear,
}: {
  query: string
  results: Product[]
  onView: (p: Product) => void
  onClear: () => void
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">
            Search results
          </div>
          <h2 className="text-2xl font-bold mt-1">
            "{query}" — {results.length} {results.length === 1 ? 'match' : 'matches'}
          </h2>
        </div>
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
      <ProductGrid products={results} loading={false} onView={onView} />
    </section>
  )
}
