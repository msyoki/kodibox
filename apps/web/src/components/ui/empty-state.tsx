import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong bg-surface px-6 py-14 text-center',
        className,
      )}
    >
      <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="9" width="22" height="16" rx="3" stroke="#0E4D45" strokeWidth="2.2" />
        <path d="M3 12L14 4l11 8" stroke="#0E4D45" strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="11" y="16" width="6" height="9" rx="1" fill="#F0B54A" />
      </svg>
      <h2 className="m-0 text-lg font-bold">{title}</h2>
      {description ? <p className="m-0 max-w-md text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
