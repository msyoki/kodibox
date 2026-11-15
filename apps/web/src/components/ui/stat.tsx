import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './card';
import { ProgressBar, type ProgressBarProps } from './progress-bar';

export interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  progress?: { value: number; tone?: ProgressBarProps['tone'] };
  /** Brand-tinted tile for an estimate or forecast figure. */
  highlight?: boolean;
}

/** KPI tile. Pass <Money /> as value for amounts. */
export function Stat({ label, value, sub, progress, highlight }: StatProps) {
  const ink = highlight ? 'text-link' : undefined;
  return (
    <Card
      className={cn(
        'flex flex-col gap-2 px-5 py-[18px]',
        highlight && 'border-bar-track bg-brand-tint',
      )}
    >
      <span className={cn('text-[13px] font-semibold', ink ?? 'text-muted')}>{label}</span>
      <span className={cn('font-mono text-[26px] font-medium tracking-tight', ink)}>{value}</span>
      {progress ? <ProgressBar value={progress.value} tone={progress.tone} label={label} /> : null}
      {sub ? <span className={cn('text-[13px]', ink ?? 'text-muted')}>{sub}</span> : null}
    </Card>
  );
}
