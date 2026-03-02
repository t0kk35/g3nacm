/**
 * Dynamic Section Display
 *
 * Client component for displaying rendered component sections.
 * Receives a pre-rendered React element and displays it with metadata.
 */

'use client';

import React from 'react';
import { ComponentError } from './ComponentError';
import type { SectionError } from '@/lib/component-section/types';

interface DynamicSectionDisplayProps {
  /** Pre-rendered React component from SectionRenderer */
  renderedComponent: React.ReactElement;

  /** Section name/title */
  sectionName?: string;

  /** Section metadata */
  metadata?: {
    sectionCode?: string;
    entityId?: string;
    entityCode?: string;
    renderedAt?: string;
    dataSources?: string[];
  };

  /** Errors that occurred during rendering */
  errors?: SectionError[];

  /** Additional CSS classes */
  className?: string;
}

/**
 * Dynamic Section Display Component
 */
export function DynamicSectionDisplay({
  renderedComponent,
  sectionName,
  metadata,
  errors,
  className = '',
}: DynamicSectionDisplayProps) {
  return (
    <div className={`dynamic-section-display ${className}`.trim()}>
      {/* Show errors if any */}
      {errors && errors.length > 0 && (
        <div className="mb-4 space-y-2">
          {errors.map((error, index) => (
            <ComponentError
              key={index}
              componentId={error.componentId}
              type={error.componentType}
              message={error.message}
              severity={error.recoverable ? 'warning' : 'error'}
            />
          ))}
        </div>
      )}

      {/* Rendered component */}
      <div className="rendered-section-content">{renderedComponent}</div>

      {/* Debug metadata (development only) */}
      {process.env.NODE_ENV === 'development' && metadata && (
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">
            Section Metadata
          </summary>
          <pre className="mt-2 overflow-auto rounded-md bg-muted p-2">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
