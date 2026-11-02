import type { ReactNode } from 'react';
import { Card } from './card';
import { ProgressBar, type ProgressBarProps } from './progress-bar';

export interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  progress?: { value: number; tone?: ProgressBarProps['tone'] };
}

/** KPI tile. Pass <Money /> as value for amounts. */
export function Stat({ label, value, sub, progress }: StatProps) {
  return (
    <Card className="flex flex-col gap-2 px-5 py-[18px]">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className="font-mono text-[26px] font-medium tracking-tight">{value}</span>
      {progress ? <ProgressBar value={progress.value} tone={progress.tone} label={label} /> : null}
      {sub ? <span className="text-[13px] text-muted">{sub}</span> : null}
    </Card>
  );
}
