'use client';

import { useState } from 'react';
import { getOrganization } from '@/demo';

export function OrgSwitcher() {
  const [open, setOpen] = useState(false);
  const org = getOrganization();
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between rounded-control border border-brand-line bg-brand-dark px-3 py-2.5 text-left text-sm text-white focus-visible:outline-2 focus-visible:outline-amber"
      >
        <span>
          <span className="block text-[11px] text-[#bfd8d2]">Organization</span>
          {org.name}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul className="absolute right-0 left-0 z-20 mt-1 list-none rounded-control border border-border bg-surface p-1 text-sm text-text shadow-lg">
          <li>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left font-semibold hover:bg-divider"
            >
              {org.name}
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-muted"
            >
              Add organization (coming soon)
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
