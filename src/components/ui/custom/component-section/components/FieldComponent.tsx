/**
 * Field Component
 *
 * A component for displaying label-value pairs.
 * Useful for showing structured data with consistent formatting.
 */

'use client';

import React from 'react';
import { z } from 'zod';
import { useTranslations, useFormatter } from 'next-intl';
import { cn } from '@/lib/utils';

export const FieldPropsSchema = z.object({
  label: z.string().describe('Field label (used as fallback when i18nKey is not provided)'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Field value'),
  variant: z
    .enum(['default', 'base', 'large', 'small', 'x_small', 'muted'])
    .default('default')
    .describe('Field variant/size'),
  showColon: z.boolean().default(true).describe('Whether to show colon after label'),
  /** next-intl message key relative to the active namespace */
  i18nKey: z.string().optional().describe('next-intl message key for the label'),
  /** next-intl namespace override; falls back to section-level i18nNamespace */
  i18nNamespace: z.string().optional().describe('next-intl namespace for the label'),
  /**
   * Value formatter. Applied after boolean coercion.
   * - 'date'     → locale date only          (Apr 24, 2026)
   * - 'datetime' → locale date + time        (Apr 24, 2026, 10:30 AM)
   * - 'time'     → locale time only          (10:30 AM)
   * - 'relative' → relative time             (2 hours ago)
   * - 'number'   → locale number             (1,234.56)
   * - 'currency' → locale currency — requires formatOptions.currency (€ 1,234.56)
   * - 'percent'  → locale percent            (12.3%)
   * - 'none'     → display as-is (default)
   */
  format: z
    .enum(['none', 'date', 'datetime', 'time', 'relative', 'number', 'currency', 'percent'])
    .default('none')
    .describe('Value formatter'),
  /**
   * Extra options passed to the underlying Intl formatter.
   * Examples:
   *   currency  → { currency: 'EUR' }
   *   number    → { minimumFractionDigits: 2 }
   *   datetime  → { dateStyle: 'full', timeStyle: 'long' }
   */
  formatOptions: z.record(z.any()).optional().describe('Extra Intl formatter options'),
});

export type FieldProps = z.infer<typeof FieldPropsSchema>;

function applyFormat(
  value: string | number,
  fmt: FieldProps['format'],
  opts: Record<string, any> | undefined,
  formatter: ReturnType<typeof useFormatter>,
): string {
  if (fmt === 'none') return String(value);
  try {
    switch (fmt) {
      case 'date':
        return formatter.dateTime(new Date(String(value)), { dateStyle: 'medium', ...opts });
      case 'datetime':
        return formatter.dateTime(new Date(String(value)), { dateStyle: 'medium', timeStyle: 'short', ...opts });
      case 'time':
        return formatter.dateTime(new Date(String(value)), { timeStyle: 'short', ...opts });
      case 'relative':
        return formatter.relativeTime(new Date(String(value)), opts as any);
      case 'number':
        return formatter.number(Number(value), opts);
      case 'currency':
        return formatter.number(Number(value), { style: 'currency', ...opts });
      case 'percent':
        return formatter.number(Number(value), { style: 'percent', ...opts });
    }
  } catch {
    // Fall back to raw value if parsing/formatting fails
  }
  return String(value);
}

export function FieldComponent({
  label,
  value,
  variant = 'default',
  showColon = true,
  i18nKey,
  i18nNamespace,
  format = 'none',
  formatOptions,
}: FieldProps) {
  // Always call the hook; namespace may be undefined (resolves from root).
  // Cast to `any` because the namespace comes from a runtime config file and
  // cannot be narrowed to next-intl's statically-inferred NamespaceKeys type.
  // Typing `t` explicitly avoids the cascading `never` inference on the key arg.
  const t = useTranslations(i18nNamespace as any) as (key: string) => string;
  const formatter = useFormatter();

  const resolvedLabel = i18nKey ? t(i18nKey) : label;

  const variantClasses = {
    default: 'text-sm',
    base:    'text-base',
    large:   'text-lg',
    small:   'text-sm',
    x_small: 'text-xs',
    muted:   'text-xs text-muted-foreground',
  };

  const displayValue =
    typeof value === 'boolean'
      ? value ? 'Yes' : 'No'
      : applyFormat(value, format, formatOptions, formatter);

  return (
    <p className={cn(variantClasses[variant])}>
      <strong>{resolvedLabel}</strong>
      {showColon && ':'} {displayValue}
    </p>
  );
}
