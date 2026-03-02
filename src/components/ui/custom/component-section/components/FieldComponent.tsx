/**
 * Field Component
 *
 * A component for displaying label-value pairs.
 * Useful for showing structured data with consistent formatting.
 */

import React from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

/**
 * Props schema for FieldComponent
 */
export const FieldPropsSchema = z.object({
  label: z.string().describe('Field label'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Field value'),
  variant: z
    .enum(['default', 'base', 'large', 'small', 'x_small', 'muted'])
    .default('default')
    .describe('Field variant/size'),
  showColon: z.boolean().default(true).describe('Whether to show colon after label'),
});

/**
 * Inferred type from schema
 */
export type FieldProps = z.infer<typeof FieldPropsSchema>;

/**
 * Field Component
 */
export function FieldComponent({
  label,
  value,
  variant = 'default',
  showColon = true,
}: FieldProps) {
  const variantClasses = {
    default: 'text-sm',
    base: 'text-base',
    large: 'text-lg',
    small: 'text-sm',
    x_small: 'text-xs',
    muted: 'text-xs text-muted-foreground',
  };

  // Convert boolean values to strings
  const displayValue = typeof value === 'boolean'
    ? (value ? 'Yes' : 'No')
    : value;

  return (
    <p className={cn(variantClasses[variant])}>
      <strong>{label}</strong>
      {showColon && ':'} {displayValue}
    </p>
  );
}