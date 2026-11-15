'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export interface MobileTab {
  label: string;
  href: string;
  /** Optional small count shown on the tab. */
  badge?: number;
}

export interface TabBarProps {
  tabs: MobileTab[];
  /** Accessible name of the navigation landmark. */
  label?: string;
}

/**
 * Bottom tab bar for the /m phone-like shell. Render it at the end of a persona layout:
 *   <TabBar tabs={[{ label: 'Home', href: '/m/tenant' }, ...]} />
 */
export function TabBar({ tabs, label = 'Primary' }: TabBarProps) {
  const pathname = usePathname();
  const matches = tabs.filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`));
  const current = matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav
      aria-label={label}
      className="sticky bottom-0 z-10 grid grid-flow-col auto-cols-fr gap-0 border-t border-border bg-surface px-2 pt-1.5 pb-3.5"
    >
      {tabs.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 flex-col items-center justify-center rounded-control text-[13px] no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link',
              active ? 'bg-brand-soft font-extrabold text-link' : 'font-semibold text-muted',
            )}
          >
            <span>
              {tab.label}
              {tab.badge ? (
                <span className="ml-1 rounded-full bg-amber px-1.5 py-0.5 text-[10px] font-bold text-text">
                  {tab.badge}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
