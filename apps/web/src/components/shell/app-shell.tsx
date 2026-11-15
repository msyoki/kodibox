'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Logo } from './logo';
import { SidebarContent } from './sidebar-content';
import { UserMenu } from './user-menu';

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-[232px] flex-none bg-brand p-4 pt-6 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="bg-amber px-4 py-1.5 text-center text-xs font-bold text-text">
          Demo mode &mdash; sample data
        </div>

        <header className="flex items-center gap-3 border-b border-border bg-surface px-[clamp(16px,3vw,40px)] py-2">
          <button
            type="button"
            aria-label={drawer ? 'Close menu' : 'Open menu'}
            aria-expanded={drawer}
            aria-controls="mobile-drawer"
            onClick={() => setDrawer((d) => !d)}
            className="flex size-11 items-center justify-center rounded-control hover:bg-divider focus-visible:outline-2 focus-visible:outline-link lg:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {drawer ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <span className="hidden items-center gap-2 sm:flex lg:hidden">
            <Logo size={24} tone="dark" />
            <span className="text-lg font-extrabold">Kodibox</span>
          </span>
          <label className="flex min-h-11 max-w-md min-w-0 flex-1 items-center gap-2 rounded-control border border-border-strong bg-surface px-3 focus-within:outline-2 focus-within:outline-link">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="sr-only">Search</span>
            <input
              type="search"
              placeholder="Search tenant, unit or M-Pesa code"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-0"
            />
          </label>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {drawer ? (
          <div id="mobile-drawer" className="border-b border-brand-dark bg-brand p-4 lg:hidden">
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </div>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col gap-6 px-[clamp(16px,3vw,40px)] pt-7 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
