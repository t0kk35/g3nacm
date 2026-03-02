/**
 * Chart Component
 *
 * A chart component for visualizing data.
 * Wraps the existing ChartDisplay component with various chart types.
 */

import React from 'react';
import { z } from 'zod';
import { ChartDisplay } from '@/components/ui/custom/ai-tools/chart-display';
import type { ChartConfig } from '@/components/ui/chart';

/**
 * Props schema for ChartComponent
 */
export const ChartPropsSchema = z.object({
  title: z.string().optional().describe('Chart title'),
  subtitle: z.string().optional().describe('Chart subtitle'),
  description: z.string().optional().describe('Chart description'),
  chartType: z
    .enum(['bar', 'line', 'area', 'pie', 'donut', 'scatter'])
    .describe('Type of chart to render'),
  data: z
    .array(z.record(z.union([z.string(), z.number()])))
    .describe('Array of data points'),
  chartConfig: z.record(
    z.object({
      label: z.string().describe('Label for this data series'),
      color: z.string().optional().describe('Color for this series'),
    })
  ).describe('Chart configuration for data series'),
  xAxisKey: z.string().optional().describe('Key for X-axis data'),
  valueKey: z.string().optional().describe('Key for value data (pie charts)'),
  nameKey: z.string().optional().describe('Key for name/label data (pie charts)'),
  height: z
    .number()
    .min(200)
    .max(800)
    .default(300)
    .describe('Chart height in pixels'),
});

/**
 * Inferred type from schema
 */
export type ChartProps = z.infer<typeof ChartPropsSchema>;

/**
 * Chart Component
 */
export function ChartComponent({
  title = 'Chart',
  subtitle,
  description,
  chartType,
  data,
  chartConfig,
  xAxisKey,
  valueKey,
  nameKey,
  height = 300,
}: ChartProps) {
  // Convert our chartConfig format to ChartConfig type
  const config: ChartConfig = {};
  for (const [key, value] of Object.entries(chartConfig)) {
    config[key] = {
      label: value.label,
      ...(value.color ? { color: value.color } : {}),
    };
  }

  return (
    <div style={{ height: `${height}px` }}>
      <ChartDisplay
        title={title}
        subtitle={subtitle}
        description={description}
        chartType={chartType}
        data={data}
        chartConfig={config}
        xAxisKey={xAxisKey}
        valueKey={valueKey}
        nameKey={nameKey}
      />
    </div>
  );
}
