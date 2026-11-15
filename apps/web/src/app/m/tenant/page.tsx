'use client';

import Link from 'next/link';
import { Badge, Money } from '@/components/ui';
import { Eyebrow } from '@/components/tenant-app/bits';
import { useTenantLocal } from '@/components/tenant-app/local-state';
import { DEMO_TENANT_ID } from '@/demo';
import { getInstruction, tenantPaidDelta } from '@/demo/recon';
import { useDemoStore } from '@/demo/store';
import {
  BALANCE,
  DUE_LABEL,
  HOME_LINES,
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
  const { localTickets } = useTenantLocal();
  const balance = Math.max(0, BALANCE - tenantPaidDelta(data, DEMO_TENANT_ID));
  const pendingClaims = data.claims.filter(
    (c) => c.tenantId === DEMO_TENANT_ID && c.status === 'pending',
  );
  const instr = getInstruction(data, data.tenants.find((t) => t.id === DEMO_TENANT_ID)?.propertyId);
  const open = listMyTickets(DEMO_TENANT_ID, data, localTickets).filter((t) =>
    isOpenStatus(t.status),
  );
  const ticket = open[0];

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>{PROPERTY_LABEL}</Eyebrow>
          <h1 className="m-0 text-[22px] font-extrabold">Hi {TENANT_FIRST_NAME}</h1>
        </div>
        <Link
          href="/m/tenant/notices"
          aria-label="Notices and notifications"
          className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-link"
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

      <section
        aria-labelledby="due"
        className="flex flex-col gap-3.5 rounded-[18px] bg-brand p-5 text-white"
      >
        <div>
          <p id="due" className="m-0 text-[13px] text-on-brand">
            {balance > 0 ? `Amount due by ${DUE_LABEL}` : 'You are all paid up'}
          </p>
          <p className="mt-1 mb-0 font-mono text-[34px] font-medium tracking-[-1px]">
            <Money minor={balance} />
          </p>
        </div>
        {balance > 0 ? (
          <>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px] text-on-brand">
              {HOME_LINES.map((l) => (
                <li key={l.label} className="flex justify-between gap-3">
                  <span>{l.label}</span>
                  <Money minor={l.amount} prefix={false} />
                </li>
              ))}
            </ul>
            <Link
              href="/m/tenant/pay"
              className="flex min-h-[52px] items-center justify-center rounded-xl bg-amber text-base font-extrabold text-on-amber no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              How to pay
            </Link>
          </>
        ) : (
          <Link
            href="/m/tenant/receipt"
            className="flex min-h-[52px] items-center justify-center rounded-xl bg-amber text-base font-extrabold text-on-amber no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            View latest receipt
          </Link>
        )}
        <p className="m-0 text-center text-xs text-on-brand">
          {instr.mpesaKind === 'till' ? 'Till' : 'Paybill'}{' '}
          <strong className="font-mono text-white">{instr.mpesaNumber}</strong>
          {instr.mpesaKind === 'paybill' ? (
            <>
              {' '}
              · Account <strong className="font-mono text-white">{TENANT_ACCOUNT}</strong>
            </>
          ) : null}
        </p>
        {pendingClaims.length > 0 ? (
          <p role="status" className="m-0 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="warn">Pending verification</Badge>
            <span className="text-on-brand">
              {pendingClaims.length} proof{pendingClaims.length > 1 ? 's' : ''} of payment waiting
              for your landlord to confirm.
            </span>
          </p>
        ) : null}
      </section>

      <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border border-border bg-surface px-1 text-xs font-semibold text-text no-underline hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-link"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-control bg-brand-soft text-xs font-extrabold text-link"
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
          <span aria-hidden="true" className="size-2.5 flex-none rounded-full bg-warning" />
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
            className="flex min-h-11 items-center px-2 text-sm font-bold text-link"
          >
            View
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="rec" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 id="rec" className="m-0 text-base font-extrabold">
            Recent receipts
          </h2>
          <Link
            href="/m/tenant/statement"
            className="flex min-h-11 items-center text-[13px] font-bold text-link"
          >
            Statement
          </Link>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {RECENT_RECEIPTS.map((r) => (
            <li
              key={r.ref}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-3"
            >
              <span className="flex flex-col gap-0.5">
                <strong className="text-sm font-bold">{r.title}</strong>
                <span className="font-mono text-xs text-muted">
                  {r.ref} · {r.when}
                </span>
                <span className="text-xs text-muted">Source: Statement import</span>
              </span>
              <Money minor={r.amount} prefix={false} className="text-sm" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
