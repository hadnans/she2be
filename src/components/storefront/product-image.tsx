'use client'

import { useState, useEffect } from 'react'

interface Props {
  src: string | null | undefined
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  fallback?: string
}

/**
 * Image with graceful fallback to a placeholder if the source fails to load.
 * Used for product images that may be missing or unreachable.
 */
export function ProductImage({ src, alt, className, loading = 'lazy', fallback }: Props) {
  const [errored, setErrored] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrored(false)
    setCurrentSrc(src)
  }, [src])

  if (!currentSrc || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className || ''}`}
        role="img"
        aria-label={alt}
      >
        <span className="text-4xl opacity-50">{fallback || '🛒'}</span>
      </div>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setErrored(true)}
    />
  )
}
