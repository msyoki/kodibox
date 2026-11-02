import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/shell/logo';
import { ToastProvider } from '@/components/ui';
import { DemoStoreProvider } from '@/demo/store';

const TABS = [
  { label: 'Overview', href: '#overview' },
  { label: 'Properties', href: '#properties' },
  { label: 'Remittances', href: '#remittances' },
  { label: 'Maintenance', href: '#maintenance' },
  { label: 'Documents', href: '#documents' },
];

/** Read-only landlord portal: simple top nav, no app sidebar. */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <DemoStoreProvider>
      <ToastProvider>
        <div className="min-h-screen bg-bg text-text">
          <header className="border-b border-border bg-surface">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Logo tone="dark" />
                <div>
                  <div className="font-extrabold">Kodibox landlord portal</div>
                  <div className="text-xs text-muted">Managed by Mwangi Properties</div>
                </div>
              </div>
              <Link
                href="/landlords"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
              >
                Back to agency view
              </Link>
            </div>
            <nav
              aria-label="Portal sections"
              className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4"
            >
              {TABS.map((t) => (
                <a
                  key={t.href}
                  href={t.href}
                  className="inline-flex min-h-11 items-center rounded-control px-3.5 text-[15px] font-medium whitespace-nowrap text-text hover:bg-divider focus-visible:outline-2 focus-visible:outline-brand"
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </div>
      </ToastProvider>
    </DemoStoreProvider>
  );
}
