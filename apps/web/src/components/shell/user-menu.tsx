'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar } from '@/components/ui';
import { authClient } from '@/features/auth/client';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function signOut() {
    await authClient.signOut(); // revokes the server-side session
    router.replace('/login');
  }
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
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex min-h-11 w-full cursor-pointer items-center rounded-control border-0 bg-transparent px-3 text-left font-semibold text-danger hover:bg-divider"
            >
              Sign out
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
