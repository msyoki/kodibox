'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './nav';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { badges } = useDemoStore();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const count = item.badge ? badges[item.badge] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center justify-between rounded-control px-3 text-[15px] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber',
              active
                ? 'bg-amber font-bold text-text'
                : 'font-medium text-on-brand hover:bg-brand-dark',
            )}
          >
            {item.label}
            {count > 0 ? (
              <span className={cn('text-xs font-bold', active ? 'text-text' : 'text-amber')}>
                {count}
                <span className="sr-only"> pending</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
