/**
 * Flex Component
 *
 * A flexbox layout container for arranging child components with configurable
 * direction, alignment, justification, gap, and wrapping.
 */

import React from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

/**
 * Props schema for FlexComponent
 */
export const FlexPropsSchema = z.object({
  direction: z
    .enum(['row', 'col', 'row-reverse', 'col-reverse'])
    .default('row')
    .describe('Flex direction'),
  justify: z
    .enum(['start', 'end', 'center', 'between', 'around', 'evenly'])
    .default('start')
    .describe('Justify content along main axis'),
  align: z
    .enum(['start', 'end', 'center', 'baseline', 'stretch'])
    .default('center')
    .describe('Align items along cross axis'),
  gap: z.number().min(0).max(12).default(4).describe('Gap size (in spacing units)'),
  wrap: z.boolean().default(false).describe('Allow children to wrap onto multiple lines'),
  className: z.string().optional().describe('Additional CSS classes'),
});

/**
 * Inferred type from schema
 */
export type FlexProps = z.infer<typeof FlexPropsSchema>;

// Static Tailwind class maps (required for Tailwind to include classes in the bundle)
const directionClasses: Record<string, string> = {
  row: 'flex-row',
  col: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'col-reverse': 'flex-col-reverse',
};

const justifyClasses: Record<string, string> = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const alignClasses: Record<string, string> = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

const gapClasses: Record<number, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

/**
 * Flex Component
 */
export function FlexComponent({
  direction = 'row',
  justify = 'start',
  align = 'center',
  gap = 4,
  wrap = false,
  className,
  children,
}: FlexProps & { children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction] || 'flex-row',
        justifyClasses[justify] || 'justify-start',
        alignClasses[align] || 'items-center',
        gapClasses[gap] ?? 'gap-4',
        wrap && 'flex-wrap',
        className,
      )}
    >
      {children}
    </div>
  );
}
