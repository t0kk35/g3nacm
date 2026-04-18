/**
 * Field Component
 *
 * A component for displaying label-value pairs.
 * Useful for showing structured data with consistent formatting.
 */

'use client';

import React from 'react';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * Props schema for FieldComponent
 */
export const FieldPropsSchema = z.object({
  label: z.string().describe('Field label (used as fallback when i18nKey is not provided)'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Field value'),
  variant: z
    .enum(['default', 'base', 'large', 'small', 'x_small', 'muted'])
    .default('default')
    .describe('Field variant/size'),
  showColon: z.boolean().default(true).describe('Whether to show colon after label'),
  /** next-intl message key relative to the active namespace (e.g. "status") */
  i18nKey: z.string().optional().describe('next-intl message key for the label'),
  /**
   * next-intl namespace override for this specific field.
   * Falls back to the section-level i18nNamespace injected by ComponentSectionRenderer.
   */
  i18nNamespace: z.string().optional().describe('next-intl namespace for the label'),
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
  i18nKey,
  i18nNamespace,
}: FieldProps) {
  // Always call the hook; namespace may be undefined (resolves from root).
  // Cast to `any` because the namespace comes from a runtime config file and
  // cannot be narrowed to next-intl's statically-inferred NamespaceKeys type.
  // Typing `t` explicitly avoids the cascading `never` inference on the key arg.
  const t = useTranslations(i18nNamespace as any) as (key: string) => string;
  const resolvedLabel = i18nKey ? t(i18nKey) : label;

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
      <strong>{resolvedLabel}</strong>
      {showColon && ':'} {displayValue}
    </p>
  );
}