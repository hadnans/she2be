'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/storefront/auth-provider'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const redirect = params.get('redirect') || '/'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      router.push(redirect)
    } catch (e: any) {
      toast.error(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-secondary/30">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xl">She2Be</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-4 text-sm text-muted-foreground text-center">
              New here?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Create an account
              </Link>
            </div>

            <div className="mt-6 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">Demo accounts:</div>
              <div>👤 customer@she2be.com / customer123</div>
              <div>🛠️ admin@she2be.com / admin123</div>
            </div>

            <Button asChild variant="ghost" size="sm" className="w-full mt-4">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to store
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
