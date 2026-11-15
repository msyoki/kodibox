import { cn } from '@/lib/cn';
import { formatKes } from '@/lib/money';

export interface MoneyProps {
  /** Integer minor units (cents of KES). */
  minor: bigint | number;
  /** Show the "KES" prefix (default true). */
  prefix?: boolean;
  className?: string;
}

export function Money({ minor, prefix = true, className }: MoneyProps) {
  return (
    <span className={cn('font-mono tabular-nums', className)}>{formatKes(minor, { prefix })}</span>
  );
}
