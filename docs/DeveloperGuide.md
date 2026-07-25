# She2Be — Developer Guide

**Version:** 2.0
**Audience:** Developers joining the project who have never seen the codebase before.
**Goal:** After reading this guide, you should be able to add features, fix bugs, and extend the platform without reverse-engineering the code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Schema](#6-database-schema)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [API Reference](#8-api-reference)
9. [Payment Architecture](#9-payment-architecture)
10. [Maps & Delivery Tracking](#10-maps--delivery-tracking)
11. [Admin Dashboard](#11-admin-dashboard)
12. [ERPNext Integration (Roadmap)](#12-erpnext-integration-roadmap)
13. [Environment Variables](#13-environment-variables)
14. [Getting Started](#14-getting-started)
15. [How to Add a New Product](#15-how-to-add-a-new-product)
16. [How to Add a New Page](#16-how-to-add-a-new-page)
17. [How to Add a New API Route](#17-how-to-add-a-new-api-route)
18. [How to Add a New Feature](#18-how-to-add-a-new-feature)
19. [How to Extend the Admin Dashboard](#19-how-to-extend-the-admin-dashboard)
20. [How to Add a New Payment Gateway](#20-how-to-add-a-new-payment-gateway)
21. [How to Integrate Future Services](#21-how-to-integrate-future-services)
22. [Build & Deployment](#22-build--deployment)
23. [Common Workflows](#23-common-workflows)
24. [Best Practices](#24-best-practices)

---

## 1. Project Overview

She2Be is a modern grocery e-commerce platform built on Next.js 16 with the App Router. It is a modular monolith: one codebase serves both the customer storefront and the admin console, backed by a single Prisma-managed database.

**Three user surfaces:**
- **Storefront** (`/`) — product browsing, cart, checkout, order tracking, wishlist
- **Admin Console** (`/admin/*`) — product CRUD, order management, analytics, warehouses
- **API** (`/api/*`) — REST endpoints shared by both surfaces

**Key design principles:**
- **Modular by feature** — every business capability (products, orders, payments, maps) is a self-contained module.
- **Explicit over magic** — folder names and file names communicate intent without conventions.
- **Production-ready** — authentication, validation, audit logging, and error handling are first-class concerns.
- **Extensible** — adding a new payment provider, page, or API route follows a copy-paste-modify pattern.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | Latest React 19, server components, file-based routing |
| Language | **TypeScript 5** | Type safety end-to-end |
| Styling | **Tailwind CSS 4** + **shadcn/ui** | Utility-first, consistent design system |
| State (client) | **Zustand** | Cart state with localStorage persistence |
| State (server) | **React hooks** + fetch | No Redux/React Query needed at this scale |
| Database | **Prisma ORM** + **SQLite** (dev) | Schema is portable to PostgreSQL |
| Auth | HMAC-signed httpOnly cookies | No external auth service dependency |
| Maps | **OpenStreetMap** + **Leaflet** | Free, no API key required |
| Charts | **Recharts** | Admin analytics dashboards |
| Animations | **Framer Motion** | Page transitions, micro-interactions |
| Icons | **lucide-react** | Consistent icon set |
| Toasts | **sonner** | User feedback notifications |
| Password hashing | Node `scrypt` | No extra dependencies |

**Switching databases:** The Prisma schema in `prisma/schema.prisma` uses only portable types. To switch to PostgreSQL, change `provider = "sqlite"` to `provider = "postgresql"`, update `DATABASE_URL`, and run `bun run db:push`. No model changes needed.

---

## 3. Folder Structure

```
she2be/
├── docs/                           # This guide + future ADRs
│   └── DeveloperGuide.md
├── prisma/
│   ├── schema.prisma               # Single source of truth for data model
│   └── seed.ts                     # Seeds demo data (categories, products, users, coupons)
├── public/
│   ├── logo.svg
│   └── robots.txt
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout: AuthProvider + ErrorBoundary + Toasters
│   │   ├── page.tsx                # Storefront homepage
│   │   ├── globals.css             # Premium grocery design tokens
│   │   ├── login/                  # Auth pages
│   │   ├── register/
│   │   ├── checkout/               # Checkout flow
│   │   ├── payment/[id]/           # Payment method selection page
│   │   ├── orders/                 # Order history
│   │   ├── order-tracking/[id]/    # Live delivery tracking with map
│   │   ├── wishlist/               # Saved items
│   │   ├── admin/                  # Admin console
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── products/           # Product management
│   │   │   ├── orders/             # Order management
│   │   │   ├── analytics/          # Analytics with charts
│   │   │   ├── warehouses/         # Warehouse management with map
│   │   │   ├── categories/         # Category management
│   │   │   └── new-product/        # Add/edit product form
│   │   └── api/                    # REST API routes
│   │       ├── auth/               # login, register, me, logout
│   │       ├── products/           # Product CRUD
│   │       ├── categories/         # Category CRUD
│   │       ├── cart/               # Cart operations
│   │       ├── orders/             # Order placement + tracking
│   │       ├── payments/           # Payment intent + verification + webhooks
│   │       ├── warehouses/         # Warehouse CRUD
│   │       ├── maps/               # Geocode + distance
│   │       ├── search/             # Global search (autocomplete)
│   │       ├── reviews/            # Product reviews
│   │       ├── wishlist/           # Wishlist operations
│   │       ├── coupons/            # Coupon validation
│   │       └── admin/              # Admin-only routes (stats, analytics, products, orders)
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (Button, Card, Input, etc.)
│   │   └── storefront/             # Business components
│   │       ├── auth-provider.tsx   # Auth context + login/register/logout
│   │       ├── header.tsx          # Header with search palette trigger
│   │       ├── footer.tsx
│   │       ├── product-card.tsx    # Product tile in grid
│   │       ├── product-detail-modal.tsx
│   │       ├── product-image.tsx   # Image with fallback placeholder
│   │       ├── cart-drawer.tsx
│   │       ├── wishlist-button.tsx
│   │       ├── reviews-section.tsx
│   │       ├── error-boundary.tsx  # Catches render errors gracefully
│   │       ├── search/
│   │       │   └── search-palette.tsx  # Cmd+K global search
│   │       ├── payments/
│   │       │   └── payment-selector.tsx
│   │       └── maps/
│   │           ├── osm-map.tsx     # Leaflet wrapper (SSR-safe)
│   │           └── order-tracking-map.tsx
│   ├── lib/
│   │   ├── api.ts                  # Typed API client (one function per endpoint)
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── money.ts                # Integer minor units <-> EGP formatting
│   │   ├── password.ts             # scrypt hash/verify
│   │   ├── session.ts              # HMAC-signed cookie session + requireUser/requireAdmin
│   │   ├── payments/               # Payment adapter registry
│   │   │   ├── types.ts            # PaymentAdapter interface
│   │   │   ├── index.ts            # Registry + getAdapter()
│   │   │   ├── cod.ts              # Cash on Delivery
│   │   │   ├── stripe.ts
│   │   │   ├── paymob.ts
│   │   │   ├── fawry.ts
│   │   │   ├── instapay.ts
│   │   │   ├── vodafone-cash.ts
│   │   │   └── apple-pay.ts
│   │   └── maps/
│   │       └── index.ts            # Geocode + routing (OSM/Mapbox/Google)
│   ├── store/
│   │   └── cart.ts                 # Zustand cart store (server + guest fallback)
│   └── hooks/
│       ├── use-mobile.ts
│       └── use-toast.ts
├── scripts/
│   ├── ssh-wrapper.py              # SSH wrapper for git over paramiko
│   ├── gen_ssh_key.py
│   └── smoke-test.js               # End-to-end smoke test
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── eslint.config.mjs
├── components.json                 # shadcn/ui config
├── .env.example
└── README.md
```

---

## 4. Frontend Architecture

### Routing

Next.js App Router uses file-based routing:
- `src/app/page.tsx` → `/`
- `src/app/admin/products/page.tsx` → `/admin/products`
- `src/app/payment/[id]/page.tsx` → `/payment/:id` (dynamic)

Each `page.tsx` is a React component. Client components start with `'use client'`.

### Component Tiers

Three tiers prevent giant page files:

1. **`components/ui/*`** — shadcn/ui primitives (Button, Card, Input, Dialog, etc.). Pure presentation, no business logic.
2. **`components/storefront/*`** — business components (ProductCard, CartDrawer, PaymentSelector, etc.). Composed of primitives. May call APIs.
3. **`app/*/page.tsx`** — thin composition layers. Import business components, lay them out. Should rarely contain business logic.

### State Management

Two clear buckets:

- **Server state** → fetched via `apiClient` (in `lib/api.ts`). Cached in component state with `useEffect` + `useState`. No global store.
- **Client-only state** → Zustand store (`store/cart.ts`). Used for the cart (which needs to persist for guests via localStorage and sync to the server for logged-in users).

### API Client

All frontend→backend communication goes through `lib/api.ts`:

```typescript
import { apiClient } from '@/lib/api'

const products = await apiClient.listProducts({ category: 'fresh-produce' })
```

Each endpoint has a typed function. To add a new endpoint, add a method to `apiClient`.

### Global Search (Cmd+K)

Press `Cmd+K` (or `Ctrl+K` on Windows/Linux) anywhere on the storefront to open the search palette (`components/storefront/search/search-palette.tsx`). It queries `/api/search` and shows products, categories, and brands with keyboard navigation (↑/↓/Enter).

### Animations

Framer Motion is used for:
- Search palette open/close
- Product card hover effects
- Order tracking progress bar fill
- Page-level transitions on key routes

Usage pattern:
```tsx
import { motion, AnimatePresence } from 'framer-motion'

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
  Content
</motion.div>
```

---

## 5. Backend Architecture

### Route Handlers

Every API endpoint is a Next.js Route Handler in `src/app/api/<resource>/route.ts`. Each file exports `GET`, `POST`, `PATCH`, or `DELETE` functions.

**Example: `src/app/api/products/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET(req: NextRequest) {
  // Public: list products with filters
  const products = await db.product.findMany({ ... })
  return NextResponse.json({ items: products })
}

export async function POST(req: NextRequest) {
  // Admin-only: create product
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... create product
}
```

### Service Layer Conventions

- One route handler = one use case (list, create, update, delete).
- All multi-step writes (e.g., placing an order) run inside `prisma.$transaction(...)` for atomicity.
- Cross-module calls happen via direct service function imports — no separate service layer abstraction at this scale.

### Validation

Request bodies are validated inline (basic checks for required fields, types). For complex validation, the architecture supports adding Zod schemas per route — see `packages/types` reference in the master architecture doc.

### Error Handling

- Auth errors: `requireUser()` / `requireAdmin()` throw — wrap in try/catch and return 401/403 JSON.
- Validation errors: return 400 with `{ error: 'message' }`.
- Not found: return 404 with `{ error: 'Not found' }`.
- Server errors: caught by Next.js error boundary; logged to console.

### Audit Logging

Every admin mutation (create/update/delete on products, categories, warehouses, orders) writes an `AuditLog` entry:

```typescript
await db.auditLog.create({
  data: {
    actorEmail: user.email,
    action: 'UPDATE',
    entity: 'product',
    entityId: id,
    metadata: JSON.stringify({ changedFields: Object.keys(changes) }),
  },
})
```

---

## 6. Database Schema

The schema lives in `prisma/schema.prisma`. Key models:

### Identity & Access
- **User** — customers, staff, admins (distinguished by `role` field)
- **Address** — shipping/billing addresses (many-to-one with User)
- **RefreshToken** — for future token rotation

### Catalog
- **Category** — hierarchical (self-referencing `parentId`), with icon + image
- **Brand** — manufacturer metadata
- **Product** — core entity. Price stored as `pricePiasters` (integer minor units). Has flags: `isActive`, `isFeatured`, `isOrganic`, `isVegan`. Soft-deleted via `deletedAt`.

### Cart & Orders
- **Cart** / **CartItem** — one cart per user, items reference products
- **Order** / **OrderItem** — immutable snapshot of cart at purchase time. Order status: `pending` → `paid` → `preparing` → `out_for_delivery` → `delivered` (or `cancelled`/`refunded`)
- **Payment** — payment attempts per order (one order can have multiple attempts if retries). Provider, status, transaction ID stored.

### Reviews & Wishlist
- **Review** — one per user per product (1-5 stars + title + body). Aggregated into `Product.ratingAvg` / `ratingCount`.
- **Wishlist** / **WishlistItem** — saved items per user

### Coupons
- **Coupon** — discount codes. Types: `percent` or `fixed`. Usage limits, min order, max discount, validity window.

### Operations
- **Warehouse** — fulfillment locations with lat/lng coordinates
- **DeliveryDriver** — drivers with live coordinates
- **DeliveryTracking** — per-order tracking with status, ETA, route polyline
- **AuditLog** — who changed what, when

### Money Storage

All monetary amounts are stored as **integer minor units** (piasters, where 1 EGP = 100 piasters). This avoids floating-point rounding errors. Use `lib/money.ts` to format:

```typescript
import { formatEgp, egpToPiasters } from '@/lib/money'
formatEgp(5500)  // "55.00 EGP"
egpToPiasters(55.00)  // 5500
```

### Database Migrations

In dev: `bun run db:push` (syncs schema to DB, no migration files).
In production: use `prisma migrate deploy` with committed migration files (TODO: set up CI for this).

---

## 7. Authentication & Authorization

### Session Mechanism

- User signs in via `POST /api/auth/login` with email + password.
- Server verifies password with `scrypt`, then sets an HMAC-signed httpOnly cookie containing `{ userId, role, email }`.
- The cookie is signed with `SESSION_SECRET` (env var, or a dev fallback).
- Cookie expiry: 30 days.

### Helper Functions (`lib/session.ts`)

```typescript
getCurrentUser()    // Returns user or null (no throw)
requireUser()       // Throws if not signed in (use in route handlers)
requireAdmin()      // Throws if not admin
```

### Route Protection Pattern

```typescript
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... route logic
}
```

### Frontend Auth

`components/storefront/auth-provider.tsx` wraps the app in a React Context. Use the `useAuth()` hook:

```typescript
const { user, loading, login, register, logout } = useAuth()
```

The context automatically calls `GET /api/auth/me` on mount to restore the session.

### Roles

- `customer` — default role for new sign-ups. Can shop, place orders, leave reviews, save wishlist.
- `admin` — can access `/admin/*` routes and call admin APIs. Can manage products, orders, categories, warehouses.

To make a user admin, manually update their `role` field in the database (no UI for this yet — TODO).

---

## 8. API Reference

### Auth
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Sign in | Public |
| POST | `/api/auth/register` | Create account | Public |
| GET | `/api/auth/me` | Get current user | Public (returns null if not signed in) |
| POST | `/api/auth/logout` | Sign out | Public |

### Products
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/products` | List with filters (`?q=`, `?category=`, `?featured=`, `?organic=`, `?sort=`, `?page=`, `?pageSize=`) | Public |
| GET | `/api/products/[slug]` | Get single product with reviews | Public |
| POST | `/api/products` | Create product | Admin |
| PATCH | `/api/products/[slug]` | Update product | Admin |
| DELETE | `/api/products/[slug]` | Soft-delete product | Admin |

### Categories
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/categories` | List all categories | Public |
| POST | `/api/categories` | Create category | Admin |

### Cart
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/cart` | Get current user's cart | User |
| POST | `/api/cart` | Add item to cart | User |
| DELETE | `/api/cart` | Clear cart | User |
| POST | `/api/cart/items` | Set item quantity | User |
| DELETE | `/api/cart/items/[id]` | Remove item | User |

### Orders
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/orders` | List user's orders | User |
| POST | `/api/orders` | Place order (transactional) | User |
| GET | `/api/orders/[id]` | Get order details | Owner/Admin |
| GET | `/api/orders/[id]/track` | Get delivery tracking info | Owner/Admin |

### Payments
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/payments/providers` | List configured payment providers | Public |
| POST | `/api/payments` | Create payment intent | User |
| POST | `/api/payments/verify` | Verify payment after redirect | User |
| POST | `/api/payments/webhook?provider=X` | Webhook receiver | Public (signature-verified by adapter) |

### Wishlist & Reviews
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/wishlist` | Get wishlist | User |
| POST | `/api/wishlist` | Add to wishlist | User |
| DELETE | `/api/wishlist/[id]` | Remove from wishlist | User |
| GET | `/api/reviews?productId=X` | List reviews for product | Public |
| POST | `/api/reviews` | Create/update review | User |

### Coupons
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/coupons/validate` | Validate coupon code | Public |

### Maps
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/maps/geocode?q=X` | Geocode address → coordinates | Public |
| POST | `/api/maps/distance` | Calculate driving distance + ETA | Public |

### Warehouses
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/warehouses` | List active warehouses | Public |
| POST | `/api/warehouses` | Create warehouse (auto-geocodes) | Admin |
| PATCH | `/api/warehouses/[id]` | Update warehouse | Admin |
| DELETE | `/api/warehouses/[id]` | Deactivate warehouse | Admin |

### Search
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/search?q=X` | Global search (products + categories + brands) | Public |

### Admin
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/admin/stats` | Dashboard summary metrics | Admin |
| GET | `/api/admin/analytics?days=30` | Aggregate analytics for charts | Admin |
| GET | `/api/admin/products` | List all products (incl. inactive) | Admin |
| PATCH | `/api/admin/products/[id]` | Update product | Admin |
| DELETE | `/api/admin/products/[id]` | Soft-delete product | Admin |
| GET | `/api/admin/orders?status=X` | List orders with filter | Admin |
| PATCH | `/api/admin/orders/[id]` | Update order status/payment | Admin |

---

## 9. Payment Architecture

### Design

The payment system is **provider-agnostic**. The checkout flow never knows which gateway it's using — it talks to a `PaymentAdapter` interface, and each provider implements it.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Checkout   │────▶│  /api/payments   │────▶│ PaymentAdapter  │
│  (frontend) │     │  (route handler) │     │  (provider)     │
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  Payment (table) │
                    │  - provider      │
                    │  - status        │
                    │  - transactionId │
                    └──────────────────┘
```

### PaymentAdapter Interface

Every provider implements this (`lib/payments/types.ts`):

```typescript
interface PaymentAdapter {
  id: PaymentProviderId       // 'stripe' | 'paymob' | etc.
  displayName: string          // "Credit / Debit Card (Stripe)"
  isConfigured(): boolean      // True if env vars are set
  createIntent(ctx): Promise<PaymentIntent>
  verifyPayment(intent, params): Promise<PaymentVerification>
  handleWebhook?(payload, headers): Promise<unknown>
}
```

### Supported Providers

| Provider | Status | Env Vars Required |
|---|---|---|
| Cash on Delivery | ✅ Always enabled | None |
| Stripe | ✅ Production-ready | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Paymob | ✅ Production-ready | `PAYMOB_API_KEY`, `PAYMOB_MERCHANT_ID`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_IFRAME_ID` |
| Fawry | ✅ Production-ready | `FAWRY_MERCHANT_CODE`, `FAWRY_SECURITY_KEY` |
| InstaPay | ✅ UI + backend ready, API endpoint placeholder | `INSTAPAY_MERCHANT_EMAIL`, `INSTAPAY_API_KEY`, `INSTAPAY_API_BASE` |
| Vodafone Cash | ✅ UI + backend ready, API endpoint placeholder | `VODAFONE_CASH_MERCHANT_MSISDN`, `VODAFONE_CASH_API_KEY`, `VODAFONE_CASH_USERNAME`, `VODAFONE_CASH_PASSWORD` |
| Apple Pay | ✅ UI + backend ready (uses Stripe or Paymob as processor) | `APPLE_PAY_MERCHANT_ID`, `APPLE_PAY_PROCESSOR`, `STRIPE_SECRET_KEY` or `PAYMOB_API_KEY` |

### Payment Flow

1. Customer places order → `POST /api/orders` creates an `Order` with `paymentStatus: 'unpaid'`.
2. Frontend redirects to `/payment/[orderId]`.
3. Customer selects a provider → `POST /api/payments` with `{ orderId, provider }`.
4. Backend calls `adapter.createIntent()` → creates a `Payment` record + returns `{ redirectUrl?, clientSecret? }`.
5. Frontend either:
   - Redirects to `redirectUrl` (Stripe, Paymob, InstaPay, Vodafone Cash)
   - Opens `ApplePaySession` (Apple Pay)
   - Confirms immediately (COD)
6. After payment, customer returns to `/orders/[id]?paid=1`.
7. Webhook from provider → `POST /api/payments/webhook?provider=X` → verifies signature + marks order paid.

### Activating a Provider

1. Set the env vars in `.env` (see `.env.example` for the full list).
2. Restart the dev server.
3. The provider automatically appears in `GET /api/payments/providers` and the checkout UI.

### Adding a New Provider

See [Section 20](#20-how-to-add-a-new-payment-gateway).

---

## 10. Maps & Delivery Tracking

### Provider Abstraction

`lib/maps/index.ts` abstracts the maps provider. Set `MAPS_PROVIDER` env var to choose:

- `osm` (default) — OpenStreetMap + Nominatim (geocoding) + OSRM (routing). **Free, no API key.**
- `mapbox` — Mapbox Directions API + geocoding. Requires `MAPBOX_ACCESS_TOKEN`.
- `google` — Google Maps Directions + Geocoding. Requires `GOOGLE_MAPS_API_KEY`.

### Functions

```typescript
geocode(address: string): Promise<GeocodeResult[]>
calculateRoute(from, to): Promise<RouteInfo>
haversineMeters(a, b): number  // straight-line distance (no API call)
```

### Frontend Map Component

`components/storefront/maps/osm-map.tsx` wraps Leaflet. It's SSR-safe (uses dynamic import).

```tsx
import { OsmMap, MapMarker } from '@/components/storefront/maps/osm-map'

const markers: MapMarker[] = [
  { lat: 30.0444, lng: 31.2357, title: 'Warehouse', color: 'orange' },
  { lat: 30.0566, lng: 31.2402, title: 'Driver', isDriver: true },
  { lat: 30.0780, lng: 31.2440, title: 'Customer', color: 'green' },
]

<OsmMap markers={markers} route={polylinePoints} height="400px" />
```

### Delivery Tracking

- Each order has an optional `DeliveryTracking` record linking it to a driver and warehouse.
- The `/order-tracking/[id]` page polls `/api/orders/[id]/track` every 30 seconds for live updates.
- The tracking UI shows a progress bar with stages: `preparing → picked_up → out_for_delivery → delivered`.

### Warehouse Management

Admins can add warehouses at `/admin/warehouses`. When creating a warehouse, the address is auto-geocoded via the maps provider. Warehouses appear on a map showing all fulfillment locations.

---

## 11. Admin Dashboard

### Pages

| Route | Purpose |
|---|---|
| `/admin` | Dashboard: revenue, orders, products, low-stock stats + recent orders |
| `/admin/products` | Product table with search, toggle active/featured, edit, soft-delete |
| `/admin/new-product` | Add/edit product form (also handles `?id=X` for editing) |
| `/admin/orders` | Order table with status filter, detail dialog with status/payment update |
| `/admin/analytics` | Charts: revenue trend, top products, category distribution, payment methods |
| `/admin/warehouses` | Warehouse CRUD with map view |
| `/admin/categories` | Category CRUD with emoji icons |

### Architecture

- Every admin page is a client component that:
  1. Calls `useAuth()` to check if user is admin (redirects to `/login` if not)
  2. Fetches data from `/api/admin/*` endpoints
  3. Renders a table/form/dashboard
- All admin API routes call `requireAdmin()` which throws if the user isn't an admin.
- Every mutation writes an `AuditLog` entry.

### Sidebar Navigation

The sidebar is defined inline in `app/admin/page.tsx` in the `AdminSidebar` component. To add a new admin page, add an entry to the `items` array:

```typescript
const items = [
  // ...existing items
  { href: '/admin/your-page', icon: YourIcon, label: 'Your Page' },
]
```

---

## 12. ERPNext Integration (Roadmap)

The master architecture document (`masterarch_gomla.md`) names ERPNext integration as a Phase 3 goal. The current codebase is structured to make this easy:

**Planned approach:**
1. Create `src/lib/erpnext/` module with an `ErpNextClient` class.
2. Add env vars: `ERP_NEXT_BASE_URL`, `ERP_NEXT_API_KEY`, `ERP_NEXT_API_SECRET`.
3. Add a `src/app/api/integrations/erpnext/` route folder for sync endpoints.
4. Sync directions:
   - **Products** → ERPNext items (when product is created/updated)
   - **Orders** → ERPNext sales orders (when order is placed)
   - **Inventory** → from ERPNext stock levels (periodic sync)
5. Use Prisma webhooks + a job queue (BullMQ in Phase 2) for async sync.

No code exists yet for this — the architecture is ready when the integration is prioritized.

---

## 13. Environment Variables

See `.env.example` for the complete list. Key groups:

| Group | Variables | Required? |
|---|---|---|
| Database | `DATABASE_URL` | Yes |
| App | `NODE_ENV`, `SESSION_SECRET` | `NODE_ENV` yes; `SESSION_SECRET` for production |
| Payments | `STRIPE_*`, `PAYMOB_*`, `FAWRY_*`, `INSTAPAY_*`, `VODAFONE_CASH_*`, `APPLE_PAY_*` | Optional (only enable providers you use) |
| Maps | `MAPS_PROVIDER`, `MAPBOX_ACCESS_TOKEN`, `GOOGLE_MAPS_API_KEY` | Optional (defaults to free OSM) |
| Email | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Optional (future use) |
| ERPNext | `ERP_NEXT_*` | Optional (future use) |

---

## 14. Getting Started

### Prerequisites

- Node.js 20+ (or Bun 1.1+)
- A PostgreSQL or SQLite database (SQLite is default for dev)

### Installation

```bash
# Clone the repo
git clone git@github.com:hadnans/she2be.git
cd she2be

# Install dependencies
bun install

# Copy env template
cp .env.example .env
# Edit .env if you need to change DATABASE_URL or add payment keys

# Create the database + apply schema
bun run db:push

# Seed demo data (10 categories, 49 products, 2 users, 2 coupons)
bun run prisma/seed.ts

# Start the dev server
bun run dev
```

Open `http://localhost:3000`.

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@she2be.com` | `admin123` |
| Customer | `customer@she2be.com` | `customer123` |

Sign in as admin to access `http://localhost:3000/admin`.

### Useful Commands

```bash
bun run dev          # Start dev server on port 3000
bun run lint         # ESLint check
bun run db:push      # Push schema changes to DB
bun run db:generate  # Regenerate Prisma client (after schema changes)
bun run db:reset     # Reset DB (WARNING: destroys data)
bun run prisma/seed.ts  # Re-seed demo data
node scripts/smoke-test.js  # End-to-end smoke test
```

---

## 15. How to Add a New Product

### Via Admin UI (recommended)

1. Sign in as admin at `/login`.
2. Go to `/admin/new-product`.
3. Fill in: name, slug (auto-generated), price (in EGP), category, stock, image URL.
4. Toggle flags: active, featured, organic, vegan.
5. Click "Create product".

### Via API

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Cookie: she2be_session=<your-session-cookie>" \
  -d '{
    "name": "Organic Apples",
    "slug": "organic-apples",
    "pricePiasters": 4500,
    "categoryId": "<category-id>",
    "stock": 100,
    "unit": "1kg bag",
    "imageUrl": "https://...",
    "isOrganic": true,
    "isActive": true
  }'
```

### Via Seed Script

Edit `prisma/seed.ts` and add to the `products` array, then re-run `bun run prisma/seed.ts`.

---

## 16. How to Add a New Page

1. Create a folder under `src/app/` matching the route:
   ```
   src/app/my-page/page.tsx   →  /my-page
   ```

2. If the page needs auth, use the `useAuth()` hook:
   ```tsx
   'use client'
   import { useAuth } from '@/components/storefront/auth-provider'
   import { useRouter } from 'next/navigation'
   import { useEffect } from 'react'

   export default function MyPage() {
     const { user, loading } = useAuth()
     const router = useRouter()
     useEffect(() => {
       if (!loading && !user) router.push('/login?redirect=/my-page')
     }, [user, loading, router])
     if (loading || !user) return <div>Loading...</div>
     return <div>My Page</div>
   }
   ```

3. To add the page to the header navigation, edit `components/storefront/header.tsx`.
4. To add it to the admin sidebar, edit the `items` array in `app/admin/page.tsx`.

---

## 17. How to Add a New API Route

1. Create a folder under `src/app/api/`:
   ```
   src/app/api/my-resource/route.ts          → GET, POST
   src/app/api/my-resource/[id]/route.ts     → GET, PATCH, DELETE
   ```

2. Export the HTTP methods you need:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { db } from '@/lib/db'
   import { requireAdmin, getCurrentUser } from '@/lib/session'

   export async function GET(req: NextRequest) {
     // Public endpoint
     const items = await db.myModel.findMany()
     return NextResponse.json({ items })
   }

   export async function POST(req: NextRequest) {
     // Admin-only endpoint
     try {
       await requireAdmin()
     } catch {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }
     const body = await req.json()
     const created = await db.myModel.create({ data: body })
     return NextResponse.json(created, { status: 201 })
   }
   ```

3. Add a typed method to `lib/api.ts` so the frontend can call it:
   ```typescript
   listMyResource: () => api<{ items: MyResource[] }>(`/api/my-resource`),
   ```

4. If you need a new Prisma model, add it to `prisma/schema.prisma`, then run `bun run db:push`.

---

## 18. How to Add a New Feature

A typical feature touches multiple layers. Here's the checklist:

1. **Database** — Add or modify models in `prisma/schema.prisma`. Run `bun run db:push`.
2. **API** — Create route handlers under `src/app/api/<feature>/`.
3. **API client** — Add typed methods to `src/lib/api.ts`.
4. **Components** — Create business components under `src/components/storefront/<feature>/`.
5. **Pages** — Create page routes under `src/app/<feature>/`.
6. **Navigation** — Add links in the header (`header.tsx`) or admin sidebar (`app/admin/page.tsx`).
7. **Lint** — Run `bun run lint` to ensure no errors.
8. **Test** — Use Agent Browser or manually verify the feature works end-to-end.

**Example: Adding a "Loyalty Points" feature**

1. Add `LoyaltyPoints` model to Prisma (one-to-one with User).
2. Create `/api/loyalty/route.ts` (GET user's points, POST to redeem).
3. Add `apiClient.getLoyalty()` to `lib/api.ts`.
4. Create `components/storefront/loyalty-points-display.tsx`.
5. Add a `/loyalty` page showing points + redemption options.
6. Add a "Loyalty" link to the header user dropdown.
7. Run `bun run lint` and test.

---

## 19. How to Extend the Admin Dashboard

### Add a New Admin Page

1. Create `src/app/admin/your-page/page.tsx`.
2. Use the same auth pattern as other admin pages:
   ```tsx
   useEffect(() => {
     if (!loading && (!user || user.role !== 'admin')) {
       router.push('/login?redirect=/admin/your-page')
     }
   }, [user, loading, router])
   ```
3. Add the page to the admin sidebar in `app/admin/page.tsx`:
   ```typescript
   const items = [
     // ...
     { href: '/admin/your-page', icon: YourIcon, label: 'Your Page' },
   ]
   ```
4. Add a quick action card on the dashboard if it's a primary feature.

### Add a New Dashboard Stat

Edit `app/admin/page.tsx`'s `StatCard` grid. Add a new `<StatCard>` with the metric. Update `/api/admin/stats` to compute and return the value.

### Add a New Analytics Chart

Edit `app/admin/analytics/page.tsx`. Use Recharts to add a new chart. Update `/api/admin/analytics` to return the underlying data.

---

## 20. How to Add a New Payment Gateway

1. **Create the adapter file:** `src/lib/payments/your-provider.ts`
   ```typescript
   import { PaymentAdapter, PaymentContext, PaymentIntent, PaymentVerification } from './types'

   export const yourProviderAdapter: PaymentAdapter = {
     id: 'your_provider',
     displayName: 'Your Provider',
     isConfigured: () => !!process.env.YOUR_PROVIDER_API_KEY,
     async createIntent(ctx: PaymentContext): Promise<PaymentIntent> {
       // Call provider API to create checkout session
       // Return redirectUrl and/or clientSecret
     },
     async verifyPayment(intent, params): Promise<PaymentVerification> {
       // Verify payment after customer returns
       // Return { ok: true/false, transactionId }
     },
     async handleWebhook(payload, headers) {
       // Verify signature, parse event
       return JSON.parse(payload.toString('utf8'))
     },
   }
   ```

2. **Register the adapter** in `src/lib/payments/index.ts`:
   ```typescript
   import { yourProviderAdapter } from './your-provider'

   export const paymentAdapters: Record<PaymentProviderId, PaymentAdapter> = {
     // ...existing
     your_provider: yourProviderAdapter,
   }
   ```

3. **Add the type** to `PaymentProviderId` in `src/lib/payments/types.ts`.

4. **Add env vars** to `.env.example` with documentation.

5. **Add the icon** to `PROVIDER_ICONS` in `components/storefront/payments/payment-selector.tsx`.

The provider automatically appears in checkout once its env vars are set.

---

## 21. How to Integrate Future Services

### Pattern: Service Adapter

For any external service (email, SMS, push notifications, ERP, CRM), create a `lib/<service>/` folder with:

```
src/lib/<service>/
├── types.ts       # Service-specific interfaces
├── index.ts       # Public API + provider selection
├── provider-a.ts  # Concrete implementation A
└── provider-b.ts  # Concrete implementation B (optional)
```

The rest of the app imports from `index.ts` only — never from a specific provider file.

**Example: Email service**
```typescript
// lib/email/index.ts
export interface EmailAdapter {
  send(to: string, subject: string, body: string): Promise<void>
}

const adapter = process.env.EMAIL_PROVIDER === 'ses' ? sesAdapter : smtpAdapter
export function sendEmail(...) { return adapter.send(...) }
```

### Webhooks

For services that call back to your app (payments, ERP sync, etc.):
1. Create `src/app/api/<service>/webhook/route.ts`.
2. Verify the signature in the route handler.
3. Process the event idempotently (check if it's already been handled).
4. Update relevant database records.

### Job Queues

For long-running tasks (sync, batch emails, report generation):
- Phase 1: Use `setTimeout` / `setInterval` for simple cases.
- Phase 2+: Add BullMQ with Redis (the architecture supports this — services are isolated).

---

## 22. Build & Deployment

### Build

```bash
bun run build
```

This creates `.next/standalone/` (a self-contained server) and `.next/static/` (static assets).

### Production Start

```bash
bun run start
```

Runs the standalone server. Set `NODE_ENV=production` and all required env vars.

### Docker

The project structure supports Dockerization. Create a `Dockerfile` (TODO):

```dockerfile
FROM oven/bun:1.1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Database Migrations in Production

In dev, we use `prisma db push` (no migration history). In production:

1. Use `prisma migrate dev --name <change>` to create migration files locally.
2. Commit the `prisma/migrations/` folder.
3. In CI/CD, run `prisma migrate deploy` to apply pending migrations.

### Environment Variables

Set all required env vars in your deployment platform (Vercel, Railway, AWS, etc.). See `.env.example` for the full list.

---

## 23. Common Workflows

### "I want to change the price of a product"

1. Sign in as admin → `/admin/products`.
2. Find the product → click edit (pencil icon).
3. Change the price → save.

Or via API:
```bash
PATCH /api/admin/products/<id>
{ "pricePiasters": 5500 }
```

### "A customer reports their cart is empty after login"

This happens when a guest cart (localStorage) isn't merged with the server cart. Current behavior: guest cart is preserved separately. To merge, we'd add a `POST /api/cart/merge` endpoint (TODO).

### "I want to add a new payment provider"

See [Section 20](#20-how-to-add-a-new-payment-gateway).

### "I want to disable a payment provider temporarily"

Unset its env vars and restart. The provider automatically disappears from checkout.

### "I want to see all orders placed today"

Sign in as admin → `/admin/orders?status=pending` (or any status filter).

### "I want to add a new warehouse"

Sign in as admin → `/admin/warehouses` → "New warehouse" → fill in address. The address is auto-geocoded.

### "The dev server won't start"

1. Check `bun install` ran successfully.
2. Check `.env` exists with `DATABASE_URL`.
3. Check port 3000 isn't already in use.
4. Read `dev.log` for errors.

### "Prisma says 'Cannot read properties of undefined'"

The Prisma client wasn't regenerated after a schema change. Run:
```bash
bun run db:generate
```
Then restart the dev server.

---

## 24. Best Practices

### Code Style

- **TypeScript everywhere.** No `.js` files in `src/`.
- **Functional components only.** No class components (except `ErrorBoundary`, which requires one).
- **`'use client'` directive** at the top of any file using React hooks or browser APIs.
- **`'use server'`** for server actions (none currently, but supported).
- **Consistent imports:** `@/lib/...`, `@/components/...`, `@/app/...`.

### Database

- **Always use `cuid()` IDs** (already the default in the schema).
- **Soft-delete with `deletedAt`** for products, users, orders — never hard-delete.
- **Integer minor units for money** — never floats.
- **Index foreign keys** — every `@@index` annotation in the schema matters for query perf.
- **Use Prisma's `include`** to fetch relations, not separate queries.

### Security

- **Never trust client input.** Validate in route handlers.
- **Auth checks first.** `requireAdmin()` / `requireUser()` at the top of every protected route.
- **HttpOnly cookies** for sessions (already configured).
- **HMAC-signed sessions** — tamper-proof.
- **`SESSION_SECRET`** must be a long random string in production.
- **CORS** — locked to configured origins (set in `next.config.ts` if needed).
- **Rate limiting** — TODO (Phase 2, will use Redis).

### Performance

- **Lazy-load heavy components** with `next/dynamic` (e.g., maps, charts).
- **Use `select` in Prisma** to fetch only needed fields.
- **Index hot queries** — check `@@index` annotations.
- **Paginate list endpoints** — don't return unbounded results.

### Accessibility

- **Semantic HTML** (`<button>`, `<nav>`, `<form>`) before ARIA.
- **Keyboard navigation** — all interactive elements must be reachable via Tab.
- **Alt text on images** — required for product images.
- **Color contrast** — design tokens meet WCAG AA.
- **Focus indicators** — never remove `focus-visible` outlines.

### Maintainability

- **One feature per folder.** Don't spread a feature across multiple `lib/` subfolders.
- **Copy-paste-modify for new modules.** Look at an existing module (e.g., `cart/`) and copy its shape.
- **Keep route handlers thin.** Move complex logic to `lib/<feature>/` helpers.
- **Document non-obvious decisions** with comments — future you will thank you.
- **Run `bun run lint`** before every commit.

### Git

- **Atomic commits** — one feature or fix per commit.
- **Clear commit messages** — `Add wishlist feature` not `update`.
- **Don't commit `.env`** — it's in `.gitignore`.
- **Don't commit `bun.lock`** — it's excluded (regenerate with `bun install`).
- **Don't commit `db/*.db`** — it's in `.gitignore`.

---

## Appendix: Demo Data

The seed script (`prisma/seed.ts`) creates:

- **10 categories:** Fresh Produce, Dairy & Eggs, Bakery, Meat & Poultry, Seafood, Pantry Staples, Snacks & Candy, Beverages, Frozen Foods, Household
- **5 brands:** Farm Fresh, Organic Valley, Local Harvest, Daily Dairy, Premium Cuts
- **49 products** with real Unsplash imagery and realistic Egyptian pricing
- **2 users:**
  - `admin@she2be.com` / `admin123` (admin role)
  - `customer@she2be.com` / `customer123` (customer role)
- **2 coupons:**
  - `WELCOME10` — 10% off, min 50 EGP
  - `SAVE25` — 25 EGP off, min 200 EGP

To re-seed at any time:
```bash
bun run db:reset  # WARNING: destroys all data
bun run prisma/seed.ts
```

---

**End of guide.** Questions? Open an issue on GitHub at https://github.com/hadnans/she2be/issues.
