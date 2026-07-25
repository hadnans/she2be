'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Package, FolderTree, Tag, ArrowRight, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SearchResult {
  products: Array<{
    type: 'product'
    id: string
    name: string
    slug: string
    href: string
    pricePiasters: number
    imageUrl: string | null
    category?: string
  }>
  categories: Array<{
    type: 'category'
    id: string
    name: string
    slug: string
    icon: string | null
    href: string
  }>
  brands: Array<{
    type: 'brand'
    id: string
    name: string
    slug: string
    href: string
  }>
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchPalette({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setActiveIndex(0)
        }
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')
      setResults(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  const allResults = results
    ? [...results.categories, ...results.brands, ...results.products]
    : []

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && allResults[activeIndex]) {
      e.preventDefault()
      const r = allResults[activeIndex] as any
      navigateTo(r.href)
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }, [allResults, activeIndex, onOpenChange])

  function navigateTo(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[15vh]"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl bg-card rounded-xl shadow-2xl border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-3 border-b">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products, categories, brands..."
                className="border-0 px-0 h-8 focus-visible:ring-0"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <button
                onClick={() => onOpenChange(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border"
                aria-label="Close search"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {!query.trim() ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Start typing to search across our entire catalog.
                </div>
              ) : !results || (allResults.length === 0 && !loading) ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No results for "{query}"
                </div>
              ) : (
                <div className="p-2">
                  {results.categories.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
                        Categories
                      </div>
                      {results.categories.map((c, idx) => {
                        const flatIdx = idx
                        return (
                          <button
                            key={c.id}
                            onClick={() => navigateTo(c.href)}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                              activeIndex === flatIdx ? 'bg-accent' : 'hover:bg-muted'
                            }`}
                          >
                            <span className="text-xl">{c.icon || '📂'}</span>
                            <span className="text-sm font-medium flex-1">{c.name}</span>
                            <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {results.brands.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
                        Brands
                      </div>
                      {results.brands.map((b, idx) => {
                        const flatIdx = results.categories.length + idx
                        return (
                          <button
                            key={b.id}
                            onClick={() => navigateTo(b.href)}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                              activeIndex === flatIdx ? 'bg-accent' : 'hover:bg-muted'
                            }`}
                          >
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium flex-1">{b.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {results.products.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
                        Products
                      </div>
                      {results.products.map((p, idx) => {
                        const flatIdx = results.categories.length + results.brands.length + idx
                        return (
                          <button
                            key={p.id}
                            onClick={() => navigateTo(p.href)}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                              activeIndex === flatIdx ? 'bg-accent' : 'hover:bg-muted'
                            }`}
                          >
                            <div className="h-8 w-8 rounded bg-muted overflow-hidden flex-shrink-0">
                              {p.imageUrl && (
                                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                              {p.category && (
                                <div className="text-xs text-muted-foreground">{p.category}</div>
                              )}
                            </div>
                            {p.pricePiasters > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {(p.pricePiasters / 100).toFixed(2)} EGP
                              </Badge>
                            )}
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 border rounded">↑</kbd>
                  <kbd className="px-1 py-0.5 border rounded">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 border rounded">Enter</kbd>
                  to select
                </span>
              </div>
              <span>Powered by She2Be</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
