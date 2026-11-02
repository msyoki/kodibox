'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Page header for the phone views: optional eyebrow, title, back link and a right-hand slot. */
export function ScreenHeader({
  title,
  eyebrow,
  backHref,
  right,
}: {
  title: string;
  eyebrow?: string;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-divider bg-surface px-4 py-3">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Back"
          className="grid size-11 flex-none place-items-center rounded-control text-xl font-bold hover:bg-divider"
        >
          <span aria-hidden="true">&lsaquo;</span>
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="m-0 text-xs font-semibold text-muted">{eyebrow}</p> : null}
        <h1 className="m-0 text-xl font-extrabold">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function Section({
  title,
  id,
  children,
  className,
}: {
  title: string;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn('px-4 pt-4', className)}>
      <h2 id={id} className="m-0 mb-2 text-[15px] font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Placeholder for a camera capture: toggles "photo added". */
export function PhotoButton({
  added,
  onToggle,
  label,
}: {
  added: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={added}
      className={cn(
        'flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-dashed px-3 text-sm font-bold',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        added
          ? 'border-ok bg-ok-soft text-ok'
          : 'border-brand bg-surface text-brand hover:bg-brand-tint',
      )}
    >
      <span aria-hidden="true">{added ? '✓' : '▣'}</span>
      {added ? 'Photo added (tap to remove)' : label}
    </button>
  );
}

/** Round avatar-like marker used on list rows. */
export function Mark({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: 'brand' | 'ok' | 'warn' | 'danger' | 'info';
}) {
  const t = {
    brand: 'bg-brand-soft text-brand',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
  }[tone];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 flex-none place-items-center rounded-xl text-[13px] font-extrabold',
        t,
      )}
    >
      {children}
    </span>
  );
}
