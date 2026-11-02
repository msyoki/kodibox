import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

const toneClass: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-divider text-[#3f4743]',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Alias for status columns: <StatusPill tone="ok">Paid</StatusPill>. */
export const StatusPill = Badge;
