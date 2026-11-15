'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  Money,
  ProgressBar,
  Stat,
  Switch,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { listTenants } from '@/demo';
import { getInvoiceRunSummary, listPreviewInvoices } from '@/demo/billing';
import { useDemoStore } from '@/demo/store';

export function InvoiceRun() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const summary = getInvoiceRunSummary('2026-11', data);
  const preview = listPreviewInvoices(5, '2026-11', data);
  const withEmail = listTenants({}, data).filter((t) => t.email).length;

  const [email, setEmail] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(timer.current), []);

  function generate() {
    let step = 0;
    setProgress(0);
    timer.current = setInterval(() => {
      step += 20;
      setProgress(step);
      if (step >= 100) {
        clearInterval(timer.current);
        setDone(true);
        toast(
          `${summary.toCreate} invoices created and queued by SMS${email ? ' and email' : ''}. Opted-out tenants are skipped.`,
          'ok',
        );
      }
    }, 350);
  }

  const running = progress !== null && !done;
  const mvuleSkipped = summary.skipped;

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Run summary" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat
          label="Active leases"
          value={String(summary.activeLeases)}
          sub={`${summary.units} units · ${summary.vacant} vacant`}
        />
        <Stat
          label="Invoices to create"
          value={String(summary.toCreate)}
          sub="One per lease with a complete bill"
        />
        <Stat
          label="Total to invoice"
          value={<Money minor={summary.total} />}
          sub="Rent, service charges, water, B/F"
        />
        <Stat label="Skipped" value={String(mvuleSkipped.length)} sub="Fix these, then run again" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card aria-labelledby="prev">
          <CardHeader
            id="prev"
            title={`Preview · first ${preview.length} of ${summary.toCreate}`}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toast('Preview CSV downloaded (demo).', 'info')}
              >
                Download full preview (CSV)
              </Button>
            }
          />
          <Table minWidth={560}>
            <THead>
              <TR>
                <TH>Unit · Tenant</TH>
                <TH align="right">Rent</TH>
                <TH align="right">Service</TH>
                <TH align="right">Water</TH>
                <TH align="right">B/F</TH>
                <TH align="right">Total (KES)</TH>
              </TR>
            </THead>
            <TBody>
              {preview.map((i) => {
                const amt = (kind: string) =>
                  i.lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.amount, 0);
                const other = i.total - amt('rent') - amt('service') - amt('water');
                return (
                  <TR key={i.id}>
                    <TD>
                      <span className="font-mono font-semibold">{i.unitCode}</span> · {i.tenantName}
                    </TD>
                    <TD align="right">
                      <Money minor={amt('rent')} prefix={false} />
                    </TD>
                    <TD align="right">
                      <Money minor={amt('service')} prefix={false} />
                    </TD>
                    <TD align="right">
                      <Money minor={amt('water')} prefix={false} />
                    </TD>
                    <TD align="right">
                      <Money minor={other} prefix={false} />
                    </TD>
                    <TD align="right">
                      <Money minor={i.total} prefix={false} className="font-bold" />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>

        <Card aria-labelledby="skip" className="flex flex-col gap-4">
          <div>
            <h2 id="skip" className="m-0 mb-2 text-[17px] font-bold">
              Skipped · {mvuleSkipped.length} leases
            </h2>
            {mvuleSkipped.length > 0 ? (
              <Link
                href="/utilities"
                className="flex min-h-11 items-start gap-3 rounded-control border border-divider bg-soft p-3 no-underline focus-visible:outline-2 focus-visible:outline-link"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2.5 flex-none rounded-full bg-warning"
                />
                <span className="flex flex-col gap-0.5 text-sm">
                  <strong className="font-bold text-text">
                    Missing water reading, {mvuleSkipped.length} units
                  </strong>
                  <span className="text-[13px] text-muted">
                    {mvuleSkipped[0]?.propertyName} {mvuleSkipped.map((s) => s.unit).join(', ')}.
                    Enter readings in Utilities.
                  </span>
                </span>
              </Link>
            ) : (
              <p className="m-0 text-sm text-muted">
                Nothing skipped. Every lease has a complete bill.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 border-t border-divider pt-3">
            <Switch label="SMS to tenants (opt-out included)" checked disabled readOnly />
            <Switch
              label="Also send by email"
              checked={email}
              onChange={(e) => setEmail(e.target.checked)}
            />
            <p className="m-0 text-xs text-muted" aria-live="polite">
              {email
                ? `Email goes to tenants with an address on file (${withEmail} of ${data.tenants.length}). SMS is still sent.`
                : 'Off. Only tenants with a phone number get an SMS.'}
            </p>
          </div>
          {progress !== null ? (
            <ProgressBar
              value={progress}
              tone="brand"
              label={done ? 'Invoices sent' : 'Generating invoices and queueing SMS…'}
            />
          ) : null}
          <Button size="lg" disabled={running || done} onClick={generate}>
            {done ? 'Invoices sent' : running ? 'Generating…' : 'Generate & send by SMS'}
          </Button>
          <p className="m-0 text-xs text-muted">
            Invoices post to the tenant ledger. Reminders only go to tenants who consented; every
            SMS carries an opt-out line.
          </p>
        </Card>
      </div>
    </div>
  );
}
