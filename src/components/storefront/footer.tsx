import Link from 'next/link'
import { Leaf, Mail, Phone, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-base">She2Be</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium groceries, delivered fresh to your door. Sourced from local farms and trusted brands.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-3">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#categories" className="hover:text-primary">Categories</Link></li>
              <li><Link href="/#featured" className="hover:text-primary">Featured</Link></li>
              <li><Link href="/?organic=true" className="hover:text-primary">Organic</Link></li>
              <li><Link href="/?sort=price-asc" className="hover:text-primary">Best prices</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-primary">Sign in</Link></li>
              <li><Link href="/register" className="hover:text-primary">Create account</Link></li>
              <li><Link href="/orders" className="hover:text-primary">My orders</Link></li>
              <li><Link href="/admin" className="hover:text-primary">Admin console</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                +20 100 000 0000
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                hello@she2be.com
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Cairo, Egypt
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} She2Be. All rights reserved.</p>
          <p>Built with Next.js, Prisma &amp; shadcn/ui</p>
        </div>
      </div>
    </footer>
  )
}
