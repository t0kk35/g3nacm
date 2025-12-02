'use client'

import { useGetNextAlert } from '@/hooks/use-get-next-alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { type VariantProps } from 'class-variance-authority'
import * as React from 'react'

/**
 * Props for the GetNextAlertButton component.
 * Extends all standard Button props from Shadcn/ui.
 */
interface GetNextAlertButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /**
   * Optional children to customize button content.
   * Defaults to "Get Next Alert" if not provided.
   */
  children?: React.ReactNode
  /**
   * Whether to use Radix UI Slot for composition
   */
  asChild?: boolean
}

/**
 * A button component that triggers the "Get Next Alert" operation.
 *
 * This component uses the useGetNextAlert hook internally and provides
 * a convenient wrapper with loading state and disabled behavior.
 *
 * @param {GetNextAlertButtonProps} props - Button props
 * @returns {JSX.Element} The rendered button
 *
 * @example
 * // Simple usage
 * <GetNextAlertButton />
 *
 * @example
 * // Custom styled button
 * <GetNextAlertButton variant="outline" size="sm">
 *   <Plus className="mr-2 h-4 w-4" />
 *   Assign Next
 * </GetNextAlertButton>
 *
 * @example
 * // Icon-only button
 * <GetNextAlertButton variant="ghost" size="icon">
 *   <ArrowRight className="h-4 w-4" />
 * </GetNextAlertButton>
 */
export function GetNextAlertButton({
  children = 'Get Next Alert',
  disabled,
  ...props
}: GetNextAlertButtonProps) {
  const { getNextAlert, isLoading } = useGetNextAlert()

  return (
    <Button
      onClick={getNextAlert}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        children
      )}
    </Button>
  )
}
