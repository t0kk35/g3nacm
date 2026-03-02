/**
 * Component Error Boundary
 *
 * React error boundary for catching and displaying component render errors.
 * Wraps individual components to prevent entire screen from crashing.
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComponentErrorBoundaryProps {
  /** Unique ID of the component being wrapped */
  componentId: string;

  /** Type/code of the component */
  componentType: string;

  /** Children to render */
  children: ReactNode;

  /** Optional error callback */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches errors in child components and displays fallback UI
 */
export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ComponentErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      `Component error in ${this.props.componentType} (${this.props.componentId}):`,
      error,
      errorInfo
    );

    this.setState({
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Component Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">
                Component: {this.props.componentType}
              </p>
              <p className="text-xs text-muted-foreground">
                ID: {this.props.componentId}
              </p>
            </div>

            {this.state.error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {process.env.NODE_ENV === 'development' &&
              this.state.errorInfo && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 overflow-auto rounded-md bg-muted p-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

            <Button
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
