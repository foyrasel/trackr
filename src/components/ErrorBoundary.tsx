'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  /** Optional label shown in the error card (e.g. "Dashboard"). */
  label?: string
}

interface State {
  error: Error | null
}

/**
 * Catches runtime errors in a subtree so the rest of the app keeps working.
 * Must be a class component — React error boundaries cannot be written as
 * function components.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">
            {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ error: null })}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
