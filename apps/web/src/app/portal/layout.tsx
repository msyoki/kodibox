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
            <div className="mx-auto flex min-h-16 max-w-[1160px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-[clamp(16px,3vw,40px)]">
              <div className="flex items-center gap-2.5">
                <Logo tone="dark" />
                <span className="text-xl font-extrabold tracking-tight">Kodibox</span>
                <span className="ml-2 border-l border-border pl-3.5 text-[13px] text-muted">
                  Managed by <strong className="text-text">Mwangi Properties</strong>
                </span>
              </div>
              <nav aria-label="Portal sections" className="flex flex-wrap gap-1">
                {TABS.map((t, i) => (
                  <a
                    key={t.href}
                    href={t.href}
                    className={
                      i === 0
                        ? 'inline-flex min-h-11 items-center rounded-control bg-brand-soft px-3.5 text-[15px] font-bold whitespace-nowrap text-link no-underline focus-visible:outline-2 focus-visible:outline-link'
                        : 'inline-flex min-h-11 items-center rounded-control px-3.5 text-[15px] font-medium whitespace-nowrap text-text no-underline hover:bg-divider focus-visible:outline-2 focus-visible:outline-link'
                    }
                  >
                    {t.label}
                  </a>
                ))}
              </nav>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href="/landlords"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-link"
                >
                  Back to agency view
                </Link>
                <span className="text-right leading-tight">
                  <strong className="block">Njoki Kamau</strong>
                  <span className="text-xs text-muted">Landlord</span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-full bg-brand-soft font-extrabold text-link"
                >
                  NK
                </span>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-[1160px] px-[clamp(16px,3vw,40px)] pt-6 pb-12">
            {children}
          </main>
        </div>
      </ToastProvider>
    </DemoStoreProvider>
  );
}
