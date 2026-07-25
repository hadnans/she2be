'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Star, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useAuth } from '@/components/storefront/auth-provider'
import { apiClient } from '@/lib/api'
import { formatEgp } from '@/lib/money'

interface Analytics {
  days: number
  dailySeries: Array<{ date: string; revenue: number; orders: number }>
  statusCounts: Array<{ status: string; count: number }>
  topProducts: Array<{ name: string; revenue: number; quantity: number }>
  categoryDistribution: Array<{ name: string; count: number }>
  paymentMethods: Array<{ provider: string; count: number; revenuePiasters: number }>
  summary: {
    totalRevenue: number
    totalOrders: number
    avgOrderValue: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#3b82f6',
  preparing: '#8b5cf6',
  out_for_delivery: '#6366f1',
  delivered: '#10b981',
  cancelled: '#ef4444',
  refunded: '#6b7280',
}

const PAYMENT_COLORS = ['#0a5c3e', '#16a34a', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280']

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [data, setData] = useState<Analytics | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login?redirect=/admin/analytics')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/admin/analytics?days=30', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then(setData)
        .catch(() => {})
        .finally(() => setLoadingData(false))
    }
  }, [user])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const topProducts = data?.topProducts.slice(0, 5) || []
  const pieData = (data?.categoryDistribution || []).slice(0, 6).map((c) => ({
    name: c.name,
    value: c.count,
  }))
  const paymentData = (data?.paymentMethods || []).map((p) => ({
    name: p.provider,
    value: p.count,
    revenue: p.revenuePiasters,
  }))

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Last 30 days</p>
        </div>

        {loadingData ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
            <Skeleton className="h-80 rounded-xl" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        ) : !data ? (
          <Card className="p-8 text-center">No data available.</Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Summary cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              <SummaryCard
                icon={DollarSign}
                label="Total revenue"
                value={formatEgp(data.summary.totalRevenue)}
                accent="primary"
              />
              <SummaryCard
                icon={ShoppingBag}
                label="Orders"
                value={data.summary.totalOrders.toString()}
              />
              <SummaryCard
                icon={TrendingUp}
                label="Avg. order value"
                value={formatEgp(data.summary.avgOrderValue)}
              />
            </div>

            {/* Revenue + orders chart */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Revenue & Orders (30 days)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailySeries}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0a5c3e" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#0a5c3e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ord" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={(v: any, name: string) => name === 'revenue' ? formatEgp(v) : v}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0a5c3e"
                      fill="url(#rev)"
                      name="Revenue (piasters)"
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#f59e0b"
                      fill="url(#ord)"
                      name="Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Top products */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Top products by revenue</h3>
                </div>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No sales yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          width={80}
                          tickFormatter={(v) => v.length > 12 ? v.slice(0, 11) + '…' : v}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                          formatter={(v: any) => formatEgp(v as number)}
                        />
                        <Bar dataKey="revenue" fill="#0a5c3e" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              {/* Category distribution */}
              <Card className="p-5">
                <h3 className="font-semibold mb-4">Products by category</h3>
                {pieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No products yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>

            {/* Payment methods */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Payment methods</h3>
              {paymentData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No completed payments yet. Once customers pay, the breakdown will appear here.
                </p>
              ) : (
                <div className="space-y-2">
                  {paymentData.map((p, idx) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ background: PAYMENT_COLORS[idx % PAYMENT_COLORS.length] }}
                        />
                        <span className="text-sm font-medium capitalize">{p.name.replace(/_/g, ' ')}</span>
                        <Badge variant="outline">{p.value} payments</Badge>
                      </div>
                      <span className="text-sm font-semibold">{formatEgp(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Order status distribution */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Order status distribution</h3>
              <div className="space-y-2">
                {data.statusCounts.map((s) => (
                  <div key={s.status} className="flex items-center justify-between p-2 rounded-md">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ background: STATUS_COLORS[s.status] || '#6b7280' }}
                      />
                      <span className="text-sm capitalize">{s.status.replace(/_/g, ' ')}</span>
                    </div>
                    <Badge variant="outline">{s.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent = 'default',
}: {
  icon: any
  label: string
  value: string
  accent?: 'default' | 'primary'
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
          accent === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </Card>
  )
}
