import Link from 'next/link';
import type { ReactNode } from 'react';

/** Header with a back arrow, used by the tenant sub-screens. */
export function BackHeader({
  href,
  label,
  title,
}: {
  href: string;
  label: string;
  title: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-border bg-surface px-2 py-2">
      <Link
        href={href}
        aria-label={label}
        className="flex size-11 items-center justify-center rounded-control text-text hover:bg-divider focus-visible:outline-2 focus-visible:outline-brand"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <h1 className="m-0 min-w-0 flex-1 truncate text-lg font-extrabold">{title}</h1>
    </header>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="m-0 text-xs font-semibold text-muted">{children}</p>;
}
