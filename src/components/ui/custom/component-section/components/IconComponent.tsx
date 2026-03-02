/**
 * Icon Component
 *
 * Renders a Lucide icon by name with configurable size, color, and stroke width.
 * Icon names must match the exported component names from lucide-react (e.g. "CheckCircle", "AlertTriangle").
 */

import React from 'react';
import { z } from 'zod';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props schema for IconComponent
 */
export const IconPropsSchema = z.object({
  name: z.string().describe('Lucide icon name (e.g. "CheckCircle", "AlertTriangle", "User")'),
  size: z.number().min(8).max(128).default(24).describe('Icon size in pixels'),
  color: z
    .string()
    .optional()
    .describe('Icon color as a CSS color value (e.g. "#ef4444", "currentColor", "red")'),
  strokeWidth: z
    .number()
    .min(0.5)
    .max(4)
    .default(2)
    .describe('Stroke width of the icon lines'),
  className: z.string().optional().describe('Additional CSS classes'),
});

/**
 * Inferred type from schema
 */
export type IconProps = z.infer<typeof IconPropsSchema>;

/**
 * Icon Component
 */
export function IconComponent({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  className,
}: IconProps) {
  const IconElement = (Icons as Record<string, unknown>)[name] as React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
  }> | undefined;

  if (!IconElement) {
    return (
      <span
        className={cn('inline-flex items-center justify-center text-muted-foreground', className)}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        title={`Unknown icon: ${name}`}
      >
        ?
      </span>
    );
  }

  return (
    <IconElement
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
