'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card, CardHeader, Money, ProgressBar } from '@/components/ui';
import { Mark, ScreenHeader, Section } from '@/components/mobile-ui/screen';
import { getDashboard } from '@/demo';
import { useDemoStore } from '@/demo/store';
import { listPendingCash } from '@/demo/mobile';

const ACTIONS = [
  { mark: 'Rq', label: 'Request payment', href: '/m/manager/tenants' },
  { mark: 'Ex', label: 'Record expense', href: '/maintenance' },
  { mark: 'Sm', label: 'Send reminder', href: '/messages' },
];

export function ManagerHome() {
  const { data } = useDemoStore();
  const dash = useMemo(() => getDashboard(data), [data]);
  const cash = useMemo(() => listPendingCash(data), [data]);
  const { kpis } = dash;
  const pct = Math.round(kpis.collectedPct);
  const circ = 2 * Math.PI * 44;
  const cashTotal = cash.reduce((s, p) => s + p.amount, 0);
  const unmatchedTotal = data.unmatched.reduce((s, u) => s + u.amount, 0);

  const items = [
    {
      title: `${cash.length} cash entries to approve`,
      sub: (
        <>
          <Money minor={cashTotal} /> from Otieno Ouma
        </>
      ),
      href: '/m/manager/approvals',
      tone: 'bg-warning',
    },
    {
      title: `${data.unmatched.length} unmatched M-Pesa payments`,
      sub: (
        <>
          <Money minor={unmatchedTotal} /> waiting for a unit
        </>
      ),
      href: '/m/manager/approvals',
      tone: 'bg-warning',
    },
    {
      title: '2 tickets past SLA',
      sub: <>B-14 noise complaint · staff conduct (Owner)</>,
      href: '/m/manager/alerts',
      tone: 'bg-danger',
    },
    {
      title: 'MRI tax due 20 Nov',
      sub: <>Gross rent for October ready to file</>,
      href: '/m/manager/alerts',
      tone: 'bg-danger',
    },
  ];

  return (
    <>
      <ScreenHeader eyebrow={`${data.org.name} · November`} title="Hi Wanjiru" />
      <Section title="Collected this month" id="col">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative size-[104px] flex-none">
              <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
                <circle cx="52" cy="52" r="44" fill="none" stroke="#E2E0D8" strokeWidth="10" />
                <circle
                  cx="52"
                  cy="52"
                  r="44"
                  fill="none"
                  stroke="#0E4D45"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(circ * pct) / 100} ${circ}`}
                  transform="rotate(-90 52 52)"
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-xl font-extrabold">
                {pct}%
              </span>
            </div>
            <dl className="m-0 flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-muted">Collected</dt>
                <dd className="m-0 font-bold">
                  <Money minor={kpis.collected} />
                </dd>
              </div>
              <div>
                <dt className="text-muted">Expected</dt>
                <dd className="m-0 font-bold">
                  <Money minor={kpis.expected} />
                </dd>
              </div>
            </dl>
          </div>
          <p className="m-0 flex justify-between rounded-control bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">
            <span>Outstanding</span>
            <Money minor={kpis.outstanding} />
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {dash.byProperty.map((p) => {
              const v = p.expected > 0 ? Math.round((p.collected / p.expected) * 100) : 0;
              return (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <span className="w-32 flex-none truncate">{p.name}</span>
                  <ProgressBar
                    value={v}
                    tone={v < 80 ? 'warning' : 'brand'}
                    label={`${p.name} collected`}
                    className="flex-1"
                    size="sm"
                  />
                  <span className="w-10 flex-none text-right font-mono text-xs">{v}%</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>
      <nav aria-label="Quick actions" className="grid grid-cols-3 gap-2 px-4 pt-4">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-card border border-border bg-surface px-2 text-center text-xs font-bold text-text no-underline hover:bg-brand-tint"
          >
            <Mark>{a.mark}</Mark>
            {a.label}
          </Link>
        ))}
      </nav>
      <section aria-labelledby="att" className="px-4 pt-4">
        <CardHeader id="att" title="Needs attention" />
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((i) => (
            <li key={i.title}>
              <Link
                href={i.href}
                className="flex min-h-14 items-center gap-3 rounded-card border border-border bg-surface px-3 py-2 text-text no-underline hover:bg-brand-tint"
              >
                <span aria-hidden="true" className={`size-2.5 flex-none rounded-full ${i.tone}`} />
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">{i.title}</strong>
                  <span className="text-xs text-muted">{i.sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
