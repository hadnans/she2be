'use client'

import { ReactNode, Component } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary that catches render-time errors and shows a friendly
 * fallback instead of crashing the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="text-5xl">😕</div>
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                We hit an unexpected error. Try refreshing the page.
              </p>
              <button
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                onClick={() => window.location.reload()}
              >
                Refresh page
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <pre className="text-left text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
