'use client';

import Link from 'next/link';
import { Badge, LinkButton, Money } from '@/components/ui';
import { Eyebrow } from '@/components/tenant-app/bits';
import { useTenantLocal } from '@/components/tenant-app/local-state';
import { DEMO_TENANT_ID } from '@/demo';
import { useDemoStore } from '@/demo/store';
import {
  BALANCE,
  DUE_LABEL,
  HOME_LINES,
  PAYBILL_PLACEHOLDER,
  PROPERTY_LABEL,
  RECENT_RECEIPTS,
  TENANT_ACCOUNT,
  TENANT_FIRST_NAME,
  TICKET_STATUS_LABEL,
  TICKET_TONE,
  isOpenStatus,
  listMyTickets,
} from '@/demo/tenant-app';

const ACTIONS = [
  { mark: 'St', label: 'Statement', href: '/m/tenant/statement' },
  { mark: 'Fx', label: 'Report issue', href: '/m/tenant/tickets' },
  { mark: 'Nt', label: 'Notices', href: '/m/tenant/notices' },
  { mark: 'Dc', label: 'Lease', href: '/m/tenant/notices' },
];

export default function TenantHomePage() {
  const { data } = useDemoStore();
  const { paid, localTickets } = useTenantLocal();
  const balance = Math.max(0, BALANCE - paid);
  const open = listMyTickets(DEMO_TENANT_ID, data, localTickets).filter((t) =>
    isOpenStatus(t.status),
  );
  const ticket = open[0];

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>{PROPERTY_LABEL}</Eyebrow>
          <h1 className="m-0 text-2xl font-extrabold">Hi {TENANT_FIRST_NAME}</h1>
        </div>
        <Link
          href="/m/tenant/notices"
          aria-label="Notices and notifications"
          className="flex size-11 items-center justify-center rounded-full border border-border bg-surface focus-visible:outline-2 focus-visible:outline-brand"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 16V11a6 6 0 1112 0v5l2 2H4l2-2z" />
            <path d="M10 20a2 2 0 004 0" />
          </svg>
        </Link>
      </header>

      <section aria-labelledby="due" className="rounded-panel border border-border bg-surface p-4">
        <p id="due" className="m-0 text-sm text-muted">
          {balance > 0 ? `Amount due by ${DUE_LABEL}` : 'You are all paid up'}
        </p>
        <p className="mt-1 mb-3 text-3xl font-extrabold">
          <Money minor={balance} />
        </p>
        {balance > 0 ? (
          <>
            <ul className="m-0 mb-4 flex list-none flex-col gap-1.5 border-t border-divider p-0 pt-3 text-sm">
              {HOME_LINES.map((l) => (
                <li key={l.label} className="flex justify-between gap-3">
                  <span>{l.label}</span>
                  <Money minor={l.amount} prefix={false} />
                </li>
              ))}
            </ul>
            <LinkButton href="/m/tenant/pay" size="lg" className="w-full">
              Pay with M-Pesa
            </LinkButton>
          </>
        ) : (
          <LinkButton href="/m/tenant/receipt" variant="secondary" size="lg" className="w-full">
            View latest receipt
          </LinkButton>
        )}
        <p className="mt-3 mb-0 text-sm text-muted">
          Or Paybill <strong className="font-mono">{PAYBILL_PLACEHOLDER}</strong> · Account{' '}
          <strong className="font-mono">{TENANT_ACCOUNT}</strong>
        </p>
      </section>

      <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border border-border bg-surface px-1 text-xs font-semibold text-text no-underline hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-extrabold text-brand"
            >
              {a.mark}
            </span>
            {a.label}
          </Link>
        ))}
      </nav>

      {ticket ? (
        <section
          aria-labelledby="req"
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
        >
          <div className="min-w-0 flex-1">
            <strong id="req" className="block truncate text-sm">
              {ticket.title}
            </strong>
            <Badge tone={TICKET_TONE[ticket.status]} className="mt-1">
              {TICKET_STATUS_LABEL[ticket.status]}
            </Badge>
          </div>
          <Link
            href={`/m/tenant/tickets/${ticket.id}`}
            className="flex min-h-11 items-center px-2 text-sm font-bold text-brand"
          >
            View
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="rec" className="rounded-card border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="rec" className="m-0 text-base font-extrabold">
            Recent receipts
          </h2>
          <Link
            href="/m/tenant/statement"
            className="flex min-h-11 items-center text-sm font-bold text-brand"
          >
            Statement
          </Link>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {RECENT_RECEIPTS.map((r) => (
            <li
              key={r.ref}
              className="flex items-center justify-between gap-3 border-t border-divider py-2.5 first:border-t-0"
            >
              <span className="flex flex-col">
                <strong className="text-sm">{r.title}</strong>
                <span className="font-mono text-xs text-muted">
                  {r.ref} · {r.when}
                </span>
              </span>
              <Money minor={r.amount} prefix={false} className="text-sm font-semibold" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
