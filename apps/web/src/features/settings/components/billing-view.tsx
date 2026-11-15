'use client';

import {
  Badge,
  Button,
  Card,
  CardHeader,
  Money,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { getCurrentPlan, listPlans } from '@/demo';
import { kes } from '@/lib/money';
import { useDemoStore } from '@/demo/store';

const INVOICES = [
  { id: 'KB-2026-011', period: 'November 2026', amount: kes(4500), status: 'Due 10 Nov' },
  { id: 'KB-2026-010', period: 'October 2026', amount: kes(4500), status: 'Paid' },
  { id: 'KB-2026-009', period: 'September 2026', amount: kes(4500), status: 'Paid' },
];

export function BillingView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const current = getCurrentPlan(data);
  const plans = listPlans(data);

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="plan">
        <CardHeader title="Current plan" id="plan" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-[26px] font-extrabold">{current.name}</span>
            <span className="font-mono text-[15px] text-muted">
              <Money minor={current.priceMonthly} /> per month
            </span>
          </div>
          <Badge tone="ok">Active</Badge>
        </div>
        <dl className="m-0 mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
          <div>
            <dt className="text-[13px] text-muted">Units in use</dt>
            <dd className="m-0 mt-1 font-mono text-xl">150</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">Unit limit</dt>
            <dd className="m-0 mt-1 font-mono text-xl">{current.unitLimit}</dd>
          </div>
        </dl>
        <p className="mt-3 mb-0 text-xs text-muted">
          This is the only money Kodibox receives: a subscription fee for the software. Tenant rent
          goes to your paybill or bank account, never through Kodibox.
        </p>
      </Card>

      <Card aria-labelledby="compare">
        <CardHeader title="Compare plans" id="compare" />
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.id === current.id;
            return (
              <div
                key={p.id}
                className={`flex flex-col gap-2.5 rounded-card bg-surface p-5 ${isCurrent ? 'border-2 border-brand' : 'border border-border'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[17px] font-extrabold">{p.name}</strong>
                  {isCurrent ? <Badge tone="info">Current</Badge> : null}
                </div>
                <div>
                  <Money minor={p.priceMonthly} className="text-xl font-medium" />
                  <span className="text-[13px] text-muted"> / month</span>
                </div>
                <ul className="m-0 flex-1 list-disc pl-[18px] text-sm leading-relaxed">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-soft text-sm font-bold text-link">
                    Your plan
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toast(`Plan change to ${p.name} requested. Takes effect next cycle.`, 'ok')
                    }
                  >
                    Switch to {p.name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card aria-labelledby="kinv">
        <CardHeader title="Kodibox invoices" id="kinv" />
        <Table minWidth={480}>
          <THead>
            <TR>
              <TH>Invoice</TH>
              <TH>Period</TH>
              <TH align="right">Amount</TH>
              <TH>Status</TH>
              <TH>
                <span className="sr-only">Download</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {INVOICES.map((i) => (
              <TR key={i.id}>
                <TD className="font-mono">{i.id}</TD>
                <TD>{i.period}</TD>
                <TD align="right">
                  <Money minor={i.amount} />
                </TD>
                <TD>
                  <Badge tone={i.status === 'Paid' ? 'ok' : 'warn'}>{i.status}</Badge>
                </TD>
                <TD>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast(`Invoice ${i.id} downloaded`, 'ok')}
                  >
                    PDF<span className="sr-only"> for {i.id}</span>
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
