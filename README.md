# She2Be — Premium Grocery E-Commerce Platform

A modern, full-stack grocery e-commerce platform built on the architecture defined in `masterarch_gomla.md`. Premium shopping experience with a complete admin console, ready for development and adding products.

## What's included

### Storefront (`/`)
- **Hero section** with brand promise and key value props
- **Category browser** (10 seeded categories with product counts)
- **Featured products**, **new arrivals**, **organic selection** rows
- **Live search** (debounced, hits the API)
- **Product detail modal** with quantity picker, badges, stock status
- **Cart drawer** with quantity controls (works for guests + logged-in users)
- **Promo banner** with coupon code (`WELCOME10`, `SAVE25`)
- **Newsletter signup** (front-end only — wire to your email provider)
- **Auth pages** (`/login`, `/register`) with demo credentials shown
- **Checkout** (`/checkout`) with delivery form, coupon validation, order summary
- **Order history** (`/orders`) with status badges

### Admin Console (`/admin/*`)
- **Dashboard** — revenue, orders, products, low-stock stats + recent orders
- **Products** (`/admin/products`) — searchable table, toggle active/featured, edit, soft-delete
- **Add / edit product** (`/admin/new-product`) — full form: pricing (EGP), inventory, flags, image URL
- **Categories** (`/admin/categories`) — create new categories with emoji icons

### Backend (Next.js API routes under `/api/*`)
- `GET/POST /api/products` — list with search/filter/sort/pagination + create
- `GET/PATCH/DELETE /api/products/[slug]` — single product CRUD
- `GET/POST /api/categories` — list + create
- `GET/POST/DELETE /api/cart` — current user's cart
- `POST/DELETE /api/cart/items/[id]` — line-item qty + remove
- `GET/POST /api/orders` — list + place order (transactional: stock decrement, cart clear, coupon increment)
- `GET /api/orders/[id]`
- `POST /api/coupons/validate`
- `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/admin/stats` — admin dashboard summary
- `GET /api/admin/products`, `PATCH/DELETE /api/admin/products/[id]`

All admin/product-mutation endpoints enforce authentication + admin role via a signed HMAC session cookie (see `src/lib/session.ts`). Audit log entries are written for every admin mutation.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Language | **TypeScript 5** |
| UI | **Tailwind CSS 4 + shadcn/ui** (New York style) |
| State | **Zustand** (cart) + React hooks (server state) |
| Database | **Prisma ORM** with **SQLite** (dev) — schema is PostgreSQL-compatible |
| Auth | HMAC-signed httpOnly cookie session (`src/lib/session.ts`) |
| Password hashing | Node.js built-in `scrypt` (no extra deps) |
| Icons | `lucide-react` |
| Toasts | `sonner` |

> **PostgreSQL migration:** the Prisma schema in `prisma/schema.prisma` uses only portable types. To switch to Postgres, change `provider = "sqlite"` to `provider = "postgresql"`, update `DATABASE_URL`, and run `bun run db:push`. No model changes needed.

## Getting started

```bash
# 1. Install dependencies
bun install

# 2. Create the SQLite database + apply schema
bun run db:push

# 3. Seed demo data (10 categories, 48 products, 2 users, 2 coupons)
bun run prisma/seed.ts

# 4. Start the dev server (auto-starts on port 3000)
bun run dev
```

Open `http://localhost:3000` — you'll see the storefront.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@she2be.com` | `admin123` |
| Customer | `customer@she2be.com` | `customer123` |

Sign in as admin to access `http://localhost:3000/admin` and start adding products.

## Project structure

```
src/
├── app/                          # Next.js App Router pages + API routes
│   ├── page.tsx                  # Storefront homepage
│   ├── login/ register/          # Auth pages
│   ├── checkout/ orders/         # Customer flow
│   ├── admin/                    # Admin console (dashboard, products, new-product, categories)
│   ├── api/                      # All REST endpoints (see above)
│   ├── layout.tsx                # Root layout with AuthProvider + Toasters
│   └── globals.css               # Premium grocery design tokens (forest green + warm cream)
├── components/
│   ├── storefront/               # Header, Footer, ProductCard, CartDrawer, ProductDetailModal, AuthProvider
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── api.ts                    # Typed API client (one function per endpoint)
│   ├── db.ts                     # Prisma client singleton
│   ├── money.ts                  # Integer minor units <-> EGP formatting
│   ├── password.ts               # scrypt hash/verify
│   └── session.ts                # HMAC-signed httpOnly cookie session
├── store/
│   └── cart.ts                   # Zustand cart store (server + guest fallback)
└── prisma/
    ├── schema.prisma             # 14 models: User, Address, Category, Brand, Product, Cart, CartItem, Order, OrderItem, Review, Coupon, AuditLog
    └── seed.ts                   # Demo data
```

## What's next (roadmap aligned with `masterarch_gomla.md`)

This is the **Phase 1** foundation. The architecture doc names these as next steps:

- **Phase 2:** Redis caching, refresh-token rotation, rate limiting
- **Phase 3:** ERPNext integration, maps/GPS delivery, real payment gateway
- **Phase 4:** Reviews submission, wishlist, notifications, multi-image upload via S3

The codebase is structured so each of these can be added without rewriting existing modules.

## License

Proprietary — She2Be. All rights reserved.
