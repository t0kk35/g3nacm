"use client"

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('🔍 Error info:', errorInfo);
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-medium text-destructive">Something went wrong</h3>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>An error occurred while rendering this component.</p>
            {this.state.error && (
              <details className="bg-muted/50 p-2 rounded text-xs">
                <summary className="cursor-pointer font-medium mb-1">Error details</summary>
                <div className="space-y-1">
                  <p><strong>Message:</strong> {this.state.error.message}</p>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack trace:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1 overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          <Button 
            onClick={this.handleReset}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}