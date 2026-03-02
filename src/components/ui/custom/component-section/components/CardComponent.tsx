/**
 * Card Component
 *
 * A card container for grouping related content.
 * Wraps shadcn/ui Card components with a simplified API.
 */

import React from 'react';
import { z } from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

/**
 * Props schema for CardComponent
 */
export const CardPropsSchema = z.object({
  title: z.string().optional().describe('Card title'),
  description: z.string().optional().describe('Card description'),
  className: z.string().optional().describe('Additional CSS classes'),
  showHeader: z
    .boolean()
    .default(true)
    .describe('Show header section (title/description)'),
  showFooter: z.boolean().default(false).describe('Show footer section'),
  footerContent: z.string().optional().describe('Footer content text'),
  variant: z
    .enum(['default', 'outlined', 'elevated'])
    .default('default')
    .describe('Visual variant'),
});

/**
 * Inferred type from schema
 */
export type CardProps = z.infer<typeof CardPropsSchema>;

/**
 * Card Component
 */
export function CardComponent({
  title,
  description,
  className = '',
  showHeader = true,
  showFooter = false,
  footerContent,
  variant = 'default',
  children,
}: CardProps & { children?: React.ReactNode }) {
  // Variant-specific styling
  const variantClasses = {
    default: '',
    outlined: 'border-2',
    elevated: 'shadow-lg',
  };

  return (
    <Card className={`${variantClasses[variant]} ${className}`.trim()}>
      {showHeader && (title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}

      <CardContent>{children}</CardContent>

      {showFooter && footerContent && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">{footerContent}</p>
        </CardFooter>
      )}
    </Card>
  );
}
