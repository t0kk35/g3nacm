/**
 * Component Error Display
 *
 * Display component for validation and configuration errors.
 * Shows user-friendly error messages for component rendering failures.
 */

'use client';

import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ComponentErrorProps {
  /** Component ID where error occurred */
  componentId?: string;

  /** Component type where error occurred */
  type?: string;

  /** Error message */
  message?: string;

  /** Array of error messages */
  errors?: string[];

  /** Error severity */
  severity?: 'error' | 'warning';
}

/**
 * Component Error
 * Displays validation and configuration errors
 */
export function ComponentError({
  componentId,
  type,
  message,
  errors,
  severity = 'error',
}: ComponentErrorProps) {
  const isError = severity === 'error';

  return (
    <Alert
      variant={isError ? 'destructive' : 'default'}
      className={isError ? 'border-destructive' : 'border-yellow-500'}
    >
      <div className="flex items-start gap-2">
        {isError ? (
          <XCircle className="h-5 w-5 text-destructive" />
        ) : (
          <AlertCircle className="h-5 w-5 text-yellow-600" />
        )}
        <div className="flex-1">
          <AlertTitle>
            {isError ? 'Component Error' : 'Component Warning'}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            {type && (
              <p className="text-sm">
                <span className="font-medium">Component:</span> {type}
                {componentId && (
                  <span className="text-muted-foreground"> ({componentId})</span>
                )}
              </p>
            )}

            {message && (
              <p className="text-sm">{message}</p>
            )}

            {errors && errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <p key={index} className="text-sm">
                    • {error}
                  </p>
                ))}
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
