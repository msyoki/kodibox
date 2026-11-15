import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Minimum table width in px before the wrapper scrolls horizontally. */
  minWidth?: number;
}

export function Table({ minWidth = 560, className, style, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-sm', className)}
        style={{ minWidth, ...style }}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'text-left text-xs tracking-wide text-muted uppercase [&_tr]:border-t-0',
        className,
      )}
      {...props}
    />
  );
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-t border-divider', className)} {...props} />;
}

export function TH({
  className,
  align,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-2 py-2 font-semibold first:pl-0 last:pr-0',
        align === 'right' && 'text-right',
        className,
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  align,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'right' }) {
  return (
    <td
      className={cn('px-2 py-3 first:pl-0 last:pr-0', align === 'right' && 'text-right', className)}
      {...props}
    />
  );
}
