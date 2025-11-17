import { LoaderCircle, LucideProps } from 'lucide-react';

import { cn } from '@/lib/utils';

interface Props extends LucideProps {
  className?: string;
}

export const LoadingSpinner = ({ className, ...props }: Props) => {
  return <LoaderCircle className={cn('animate-spin', className)} {...props} />;
};