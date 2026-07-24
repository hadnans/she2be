'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { useAuth } from './auth-provider'

interface Review {
  id: string
  rating: number
  title: string | null
  body: string | null
  createdAt: string
  user: { name: string | null }
}

interface Props {
  productId: string
}

export function ReviewsSection({ productId }: Props) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    apiClient
      .listReviews(productId)
      .then((res) => setReviews(res.items))
      .finally(() => setLoading(false))
  }, [productId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiClient.createReview(productId, rating, title, body)
      toast.success('Review submitted!')
      const res = await apiClient.listReviews(productId)
      setReviews(res.items)
      setShowForm(false)
      setTitle('')
      setBody('')
      setRating(5)
    } catch (e: any) {
      toast.error(e.message || 'Could not submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const avg = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              {avg.toFixed(1)} average
            </div>
          )}
        </div>
        {user && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Write a review
          </Button>
        )}
        {!user && (
          <p className="text-xs text-muted-foreground">Sign in to write a review</p>
        )}
      </div>

      {showForm && user && (
        <Card className="p-4">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Rating</Label>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1"
                    aria-label={`Rate ${n} stars`}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        (hoverRating || rating) >= n
                          ? 'fill-accent text-accent'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="rev-title">Title (optional)</Label>
              <Input
                id="rev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience"
              />
            </div>
            <div>
              <Label htmlFor="rev-body">Review</Label>
              <Textarea
                id="rev-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What did you like or dislike? How was the quality?"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit review'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No reviews yet. Be the first to share your experience!
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-medium text-sm">
                  {r.user.name || 'Anonymous'}
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-3.5 w-3.5 ${
                        n <= r.rating ? 'fill-accent text-accent' : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {r.title && (
                <div className="font-medium text-sm">{r.title}</div>
              )}
              {r.body && (
                <p className="text-sm text-muted-foreground mt-1">{r.body}</p>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                {new Date(r.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
