'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const ITEMS = [
  { label: 'Team & roles', href: '/settings/team' },
  { label: 'Security', href: '/settings/security' },
  { label: 'Audit log', href: '/settings/audit' },
  { label: 'Privacy', href: '/settings/privacy' },
  { label: 'Billing', href: '/settings/billing' },
  { label: 'Payment instructions', href: '/settings/payment-instructions' },
  { label: 'Appearance', href: '/settings/appearance' },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Settings sections"
      className="self-start overflow-x-auto rounded-card border border-border bg-surface p-2.5"
    >
      <ul className="m-0 flex list-none gap-0.5 p-0 lg:flex-col">
        {ITEMS.map((i) => {
          const active =
            pathname === i.href || (i.href === '/settings/team' && pathname === '/settings');
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center rounded-control px-3 text-sm whitespace-nowrap no-underline focus-visible:outline-2 focus-visible:outline-link',
                  active
                    ? 'bg-brand-soft font-bold text-link'
                    : 'font-medium text-text hover:bg-divider',
                )}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
