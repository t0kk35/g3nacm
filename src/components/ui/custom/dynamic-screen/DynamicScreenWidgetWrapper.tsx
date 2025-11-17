'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WidgetErrorBoundaryProps {
  children: ReactNode
  widgetId: string
  fallback?: ReactNode
}

interface WidgetErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Widget error in ${this.props.widgetId}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="h-full">
            <CardContent className="flex flex-col items-center justify-center h-full p-6">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <h3 className="text-sm font-medium text-destructive mb-2">Widget Error</h3>
              <p className="text-xs text-muted-foreground text-center mb-4">
                This widget failed to load. Please try refreshing or contact support.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => this.setState({ hasError: false })}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )
      )
    }

    return this.props.children
  }
}

export interface DynamicScreenWidgetWrapperProps {
  widgetId: string
  title: string
  children: ReactNode
  onError?: (error: Error) => void
  className?: string
}

export function DynamicScreenWidgetWrapper({
  widgetId,
  title,
  children,
  onError,
  className = ''
}: DynamicScreenWidgetWrapperProps) {
  const handleError = (error: Error) => {
    console.error(`Widget wrapper error for ${widgetId}:`, error)
    onError?.(error)
  }

  return (
    <div className={`dashboard-widget-wrapper ${className}`} data-widget-id={widgetId}>
      <WidgetErrorBoundary 
        widgetId={widgetId}
        fallback={
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-destructive">{title} - Error</h3>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Failed to load widget
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        }
      >
        {children}
      </WidgetErrorBoundary>
    </div>
  )
}