/**
 * Badge Component
 *
 * A badge for displaying status, labels, or tags.
 * Wraps shadcn/ui Badge component.
 */

import React from 'react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';

/**
 * Props schema for BadgeComponent
 */
export const BadgePropsSchema = z.object({
  text: z.string().describe('Badge text content'),
  variant: z
    .enum(['default', 'secondary', 'destructive', 'outline'])
    .default('default')
    .describe('Badge variant'),
  className: z.string().optional().describe('Additional CSS classes'),
});

/**
 * Inferred type from schema
 */
export type BadgeProps = z.infer<typeof BadgePropsSchema>;

/**
 * Badge Component
 */
export function BadgeComponent({
  text,
  variant = 'default',
  className = '',
}: BadgeProps) {
  return (
    <Badge variant={variant} className={className}>
      {text}
    </Badge>
  );
}
