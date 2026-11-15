import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-5', className)} {...props} />
  );
}

export interface CardHeaderProps {
  title: string;
  id?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, id, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-baseline justify-between gap-3', className)}>
      <h2 id={id} className="m-0 text-[17px] font-bold">
        {title}
      </h2>
      {action ? <div className="text-sm font-semibold">{action}</div> : null}
    </div>
  );
}
