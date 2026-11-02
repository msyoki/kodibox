import { cn } from '@/lib/cn';

export interface ProgressBarProps {
  /** 0-100 */
  value: number;
  tone?: 'brand' | 'warning' | 'danger' | 'info' | 'muted';
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const fill = {
  brand: 'bg-brand',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-[#c9d9d5]',
} as const;

export function ProgressBar({
  value,
  tone = 'brand',
  label,
  className,
  size = 'md',
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        'overflow-hidden rounded-full bg-divider',
        size === 'md' ? 'h-2' : 'h-1.5',
        className,
      )}
    >
      <div className={cn('h-full rounded-full', fill[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
