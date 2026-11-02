'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Money,
  ProgressBar,
  Stat,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
  type Tone,
} from '@/components/ui';
import { getDashboard } from '@/demo';
import { CHANNEL_LABEL, formatWhen } from '@/demo/format';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';

const STATUS: Record<string, { label: string; tone: Tone }> = {
  matched: { label: 'Auto-matched', tone: 'ok' },
  unmatched: { label: 'Needs match', tone: 'warn' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'info' },
};

const DOT = { warning: 'bg-warning', info: 'bg-info', muted: 'bg-muted' } as const;
const AGING_TONE = ['brand', 'brand', 'warning', 'danger'] as const;

export function DashboardView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const d = getDashboard(data);
  const k = d.kpis;
  const maxAging = Math.max(...d.aging.map((a) => a.amount), 1);
  const remindCount = k.tenantsWithBalance;

  return (
    <>
      <PageHeader
        eyebrow={d.dateLabel}
        title="Good morning, Wanjiru"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast('Demo: payment request sent to the tenant', 'ok')}
            >
              Request payment
            </Button>
            <Button onClick={() => toast('Demo: November invoices queued for review', 'ok')}>
              Run November invoices
            </Button>
          </>
        }
      />

      <section
        aria-label="Key figures"
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
      >
        <Stat
          label="Expected this month"
          value={<Money minor={k.expected} />}
          sub={`${k.units} units · ${k.occupied} occupied`}
          progress={{ value: 100, tone: 'muted' }}
        />
        <Stat
          label="Collected"
          value={<Money minor={k.collected} />}
          sub={`${k.collectedPct}% of expected · ${k.tenantsPaid} tenants paid`}
          progress={{ value: k.collectedPct }}
        />
        <Stat
          label="Outstanding"
          value={<Money minor={k.outstanding} />}
          sub={`${k.tenantsWithBalance} tenants with a balance`}
          progress={{ value: 100 - k.collectedPct, tone: 'warning' }}
        />
        <Stat
          label="Occupancy"
          value={<span>{k.occupancyPct}%</span>}
          sub={`${k.vacant} vacant · ${k.noticesToVacate} notices to vacate`}
          progress={{ value: k.occupancyPct }}
        />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[2_1_520px]" aria-labelledby="byprop" role="region">
          <CardHeader
            id="byprop"
            title={'Collections by property · November'}
            action={<Link href="/reports">All reports</Link>}
          />
          <Table minWidth={560}>
            <THead>
              <TR>
                <TH>Property</TH>
                <TH>Units</TH>
                <TH align="right">Expected</TH>
                <TH align="right">Collected</TH>
                <TH className="w-40">Progress</TH>
              </TR>
            </THead>
            <TBody>
              {d.byProperty.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <Link
                      href="/properties"
                      className="font-bold text-text no-underline hover:underline"
                    >
                      {p.name}
                    </Link>
                    <br />
                    <span className="text-xs text-muted">
                      {p.kind === 'commercial' ? `${p.area.split(',')[0]} · commercial` : p.area}
                    </span>
                  </TD>
                  <TD>{p.unitCount}</TD>
                  <TD align="right">
                    <Money minor={p.expected} prefix={false} />
                  </TD>
                  <TD align="right">
                    <Money minor={p.collected} prefix={false} />
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        className="flex-1"
                        value={p.collectedPct}
                        tone={p.collectedPct < 60 ? 'warning' : 'brand'}
                        label={`${p.name} collected`}
                      />
                      <span className="w-9 text-right text-[13px] font-semibold">
                        {p.collectedPct}%
                      </span>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-1"
          aria-labelledby="attn"
          role="region"
        >
          <h2 id="attn" className="m-0 mb-2 text-[17px] font-bold">
            Needs your attention
          </h2>
          {d.attention.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              className="flex items-start gap-3 rounded-control border border-divider bg-soft p-3 text-text no-underline hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span
                aria-hidden="true"
                className={cn('mt-1.5 size-2.5 flex-none rounded-full', DOT[a.tone])}
              />
              <span className="flex flex-col gap-0.5 text-sm">
                <strong className="font-bold">{a.title}</strong>
                <span className="text-[13px] text-muted">{a.sub}</span>
              </span>
            </Link>
          ))}
        </Card>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[2_1_520px]" aria-labelledby="recent" role="region">
          <CardHeader
            id="recent"
            title="Latest payments"
            action={<Link href="/payments">Open reconciliation</Link>}
          />
          <Table minWidth={640}>
            <THead>
              <TR>
                <TH>Time</TH>
                <TH>Tenant &middot; Unit</TH>
                <TH>Channel</TH>
                <TH>Reference</TH>
                <TH align="right">Amount</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {d.latestPayments.map((p) => {
                const s = STATUS[p.status] ?? { label: p.status, tone: 'neutral' as Tone };
                return (
                  <TR key={p.id}>
                    <TD className="text-muted">{formatWhen(p.receivedAt)}</TD>
                    <TD>
                      <strong className="font-semibold">{p.who}</strong> &middot; {p.unit}
                    </TD>
                    <TD>{CHANNEL_LABEL[p.channel]}</TD>
                    <TD className="font-mono text-[13px]">{p.reference}</TD>
                    <TD align="right">
                      <Money minor={p.amount} prefix={false} />
                    </TD>
                    <TD>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>

        <Card
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5"
          aria-labelledby="aging"
          role="region"
        >
          <h2 id="aging" className="m-0 text-[17px] font-bold">
            Arrears by age
          </h2>
          {d.aging.map((g, i) => (
            <div key={g.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span>{g.label}</span>
                <Money minor={g.amount} />
              </div>
              <ProgressBar
                size="md"
                value={(g.amount / maxAging) * 100}
                tone={AGING_TONE[i]}
                label={g.label}
                className="h-2.5"
              />
              <span className="text-xs text-muted">
                {g.tenants} {g.tenants === 1 ? 'tenant' : 'tenants'}
              </span>
            </div>
          ))}
          <Button
            variant="ghost"
            className="justify-start px-0 text-brand"
            onClick={() =>
              toast(`Demo: reminder queued for ${remindCount} tenants (opt-outs skipped)`, 'ok')
            }
          >
            Send reminder to {remindCount} tenants
          </Button>
        </Card>
      </div>
    </>
  );
}
