/**
 * Text Component
 *
 * A component for displaying formatted text content.
 * Supports different text variants (heading, paragraph, code, etc.)
 */

import React from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

/**
 * Props schema for TextComponent
 */
export const TextPropsSchema = z.object({
  content: z.string().describe('Text content'),
  variant: z
    .enum(['h1', 'h2', 'h3', 'h4', 'paragraph', 'code', 'muted'])
    .default('paragraph')
    .describe('Text variant/style'),
  className: z.string().optional().describe('Additional CSS classes'),
});

/**
 * Inferred type from schema
 */
export type TextProps = z.infer<typeof TextPropsSchema>;

/**
 * Text Component
 */
export function TextComponent({
  content,
  variant = 'paragraph',
  className = '',
}: TextProps) {
  const variantClasses = {
    h1: 'text-4xl font-bold tracking-tight',
    h2: 'text-3xl font-semibold tracking-tight',
    h3: 'text-2xl font-semibold tracking-tight',
    h4: 'text-xl font-semibold tracking-tight',
    paragraph: 'text-base leading-7',
    code: 'font-mono text-sm bg-muted px-2 py-1 rounded',
    muted: 'text-sm text-muted-foreground',
  };

  const Tag = variant.startsWith('h') ? (variant as 'h1' | 'h2' | 'h3' | 'h4') : 'p';

  return (
    <Tag className={cn(variantClasses[variant], className)}>
      {content}
    </Tag>
  );
}
