/**
 * API client helpers used by client components. Each function calls the
 * corresponding Next.js route handler.
 */

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  longDescription: string | null
  pricePiasters: number
  compareAtPricePiasters: number | null
  costPiasters: number | null
  unit: string | null
  sku: string | null
  barcode: string | null
  stock: number
  lowStockThreshold: number
  isActive: boolean
  isFeatured: boolean
  isOrganic: boolean
  isVegan: boolean
  categoryId: string
  brandId: string | null
  imageUrl: string | null
  ratingAvg: number
  ratingCount: number
  createdAt: string
  updatedAt: string
  category?: { id: string; name: string; slug: string; icon: string | null }
  brand?: { id: string; name: string; slug: string } | null
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  imageUrl: string | null
  sortOrder: number
  _count?: { products: number }
}

export interface CartResponse {
  id?: string
  items: Array<{
    id: string
    productId: string
    quantity: number
    product: Product
  }>
  subtotalPiasters: number
  itemCount: number
}

async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',  // ensure cookies are sent/received
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = (body as any).error || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return res.json()
}

export const apiClient = {
  // Products
  listProducts: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
    }
    return api<{ items: Product[]; total: number; page: number; pageCount: number }>(
      `/api/products?${qs.toString()}`
    )
  },
  getProduct: (slug: string) => api<Product>(`/api/products/${slug}`),

  // Categories
  listCategories: () => api<{ items: Category[] }>(`/api/categories`),

  // Cart
  getCart: () => api<CartResponse>(`/api/cart`),
  addToCart: (productId: string, quantity = 1) =>
    api<{ ok: boolean }>(`/api/cart`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),
  setCartItemQty: (productId: string, quantity: number) =>
    api<{ ok: boolean }>(`/api/cart/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),
  removeCartItem: (itemId: string) =>
    api<{ ok: boolean }>(`/api/cart/items/${itemId}`, { method: 'DELETE' }),
  clearCart: () => api<{ ok: boolean }>(`/api/cart`, { method: 'DELETE' }),

  // Auth
  login: (email: string, password: string) =>
    api<{ id: string; email: string; name: string | null; role: string }>(`/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name?: string) =>
    api<{ id: string; email: string; name: string | null; role: string }>(`/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  logout: () => api<{ ok: boolean }>(`/api/auth/logout`, { method: 'POST' }),
  getMe: () =>
    api<{ user: { id: string; email: string; name: string | null; role: string; phone: string | null } | null }>(`/api/auth/me`),

  // Orders
  listOrders: () => api<{ items: any[] }>(`/api/orders`),
  placeOrder: (data: any) =>
    api<any>(`/api/orders`, { method: 'POST', body: JSON.stringify(data) }),

  // Coupons
  validateCoupon: (code: string, subtotalPiasters: number) =>
    api<{ code: string; discountPiasters: number; description: string | null }>(`/api/coupons/validate`, {
      method: 'POST',
      body: JSON.stringify({ code, subtotalPiasters }),
    }),

  // Admin
  adminListProducts: (q?: string) =>
    api<{ items: Product[] }>(`/api/admin/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  adminCreateProduct: (data: any) =>
    api<Product>(`/api/products`, { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateProduct: (id: string, data: any) =>
    api<Product>(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminDeleteProduct: (id: string) =>
    api<{ ok: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  adminStats: () =>
    api<any>(`/api/admin/stats`),

  // Admin category create
  createCategory: (data: any) =>
    api<Category>(`/api/categories`, { method: 'POST', body: JSON.stringify(data) }),

  // Wishlist
  getWishlist: () => api<{ id: string; items: any[] }>(`/api/wishlist`),
  addToWishlist: (productId: string) =>
    api<{ ok: boolean }>(`/api/wishlist`, { method: 'POST', body: JSON.stringify({ productId }) }),
  removeFromWishlist: (itemId: string) =>
    api<{ ok: boolean }>(`/api/wishlist/${itemId}`, { method: 'DELETE' }),

  // Reviews
  listReviews: (productId: string) =>
    api<{ items: any[] }>(`/api/reviews?productId=${productId}`),
  createReview: (productId: string, rating: number, title?: string, body?: string) =>
    api<any>(`/api/reviews`, {
      method: 'POST',
      body: JSON.stringify({ productId, rating, title, body }),
    }),

  // Admin orders
  adminListOrders: (status?: string) =>
    api<{ items: any[] }>(`/api/admin/orders${status ? `?status=${status}` : ''}`),
  adminUpdateOrder: (id: string, data: any) =>
    api<any>(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}
