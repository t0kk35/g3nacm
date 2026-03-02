/**
 * Data Table Component
 *
 * A table component for displaying tabular data with sorting and pagination.
 * Wraps TanStackTable with a simplified configuration interface.
 */

'use client';

import React from 'react';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { TanStackTable } from '@/components/ui/custom/tanstack-table';

/**
 * Column definition schema
 */
export const DataTableColumnSchema = z.object({
  id: z.string().describe('Column identifier'),
  label: z.string().describe('Column header label'),
  accessor: z.string().describe('Data field to access (dot notation supported)'),
  width: z.number().optional().describe('Column width in pixels'),
  sortable: z.boolean().default(true).describe('Enable sorting for this column'),
  align: z
    .enum(['left', 'center', 'right'])
    .default('left')
    .describe('Text alignment'),
});

/**
 * Props schema for DataTableComponent
 */
export const DataTablePropsSchema = z.object({
  columns: z
    .array(DataTableColumnSchema)
    .min(1)
    .describe('Array of column definitions'),
  data: z.array(z.record(z.any())).describe('Array of data rows'),
  pagination: z.boolean().default(true).describe('Enable pagination'),
  pageSize: z.number().min(1).max(100).default(10).describe('Rows per page'),
  filterColumn: z.string().optional().describe('Column to enable filtering on'),
  emptyMessage: z
    .string()
    .default('No data available')
    .describe('Message when table is empty'),
});

/**
 * Inferred types from schemas
 */
export type DataTableColumn = z.infer<typeof DataTableColumnSchema>;
export type DataTableProps = z.infer<typeof DataTablePropsSchema>;

/**
 * Data Table Component
 */
export function DataTableComponent({
  columns,
  data,
  pagination = true,
  pageSize = 10,
  filterColumn,
  emptyMessage = 'No data available',
}: DataTableProps) {
  // Convert simple column definitions to TanStack ColumnDef format
  const tanStackColumns: ColumnDef<any>[] = columns.map((col) => ({
    id: col.id,
    accessorKey: col.accessor,
    header: col.label,
    enableSorting: col.sortable,
    cell: ({ row }) => {
      const value = row.getValue(col.id);
      const alignClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      };
      return (
        <div className={alignClasses[col.align || 'left']}>
          {value !== null && value !== undefined ? String(value) : '-'}
        </div>
      );
    },
    ...(col.width ? { size: col.width } : {}),
  }));

  // Show empty message if no data
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <TanStackTable
      columns={tanStackColumns}
      data={data}
      filterColumn={filterColumn}
      pageSize={pagination ? pageSize : data.length}
    />
  );
}
