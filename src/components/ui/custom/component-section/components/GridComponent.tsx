/**
 * Grid Component
 *
 * A responsive grid layout for arranging child components.
 * Uses CSS Grid with configurable columns and gaps.
 */

import React from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

/**
 * Props schema for GridComponent
 */
export const GridPropsSchema = z.object({
  columns: z
    .number()
    .min(1)
    .max(12)
    .default(2)
    .describe('Number of columns'),
  gap: z.number().min(0).max(12).default(4).describe('Gap size (in spacing units)')
});

/**
 * Inferred type from schema
 */
export type GridProps = z.infer<typeof GridPropsSchema>;

/**
 * Grid Component
 */
export function GridComponent({
  columns = 2,
  gap = 4,
  children,
}: GridProps & { children?: React.ReactNode }) {
  // Gap size mapping (Tailwind spacing scale)
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

  // Column classes
  const columnClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  };

  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns] || 'grid-cols-2',
        gapClasses[gap] || 'gap-4',
      )}
    >
      {children}
    </div>
  );
}