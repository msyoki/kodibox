'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/ui';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 rounded-control px-2 hover:bg-divider focus-visible:outline-2 focus-visible:outline-link"
      >
        <Avatar name="Wanjiru Mwangi" />
        <span className="hidden text-left text-sm leading-tight sm:block">
          <span className="block font-bold">Wanjiru Mwangi</span>
          <span className="text-xs text-muted">Owner</span>
        </span>
      </button>
      {open ? (
        <ul className="absolute right-0 z-30 mt-1 min-w-48 list-none rounded-control border border-border bg-surface p-1 text-sm shadow-lg">
          <li>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-control px-3 font-semibold text-text no-underline hover:bg-divider"
            >
              Settings and privacy
            </Link>
          </li>
          <li>
            <Link
              href="/login"
              className="flex min-h-11 items-center rounded-control px-3 font-semibold text-danger no-underline hover:bg-divider"
            >
              Sign out
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
