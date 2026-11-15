'use client';

import { LinkButton, Button, MaskedText, Money, useToast } from '@/components/ui';
import { BackHeader } from '@/components/tenant-app/bits';
import { DEMO_TENANT_ID } from '@/demo';
import { ORIGIN_LABEL, latestNewPayment, originOf } from '@/demo/recon';
import { useDemoStore } from '@/demo/store';
import { BALANCE, LANDLORD_NAME, TENANT_ACCOUNT, allocatePayment } from '@/demo/tenant-app';

export default function TenantReceiptPage() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const tenant = data.tenants.find((t) => t.id === DEMO_TENANT_ID);
  const latest = latestNewPayment(data, DEMO_TENANT_ID);
  const amount = latest?.amount ?? BALANCE;
  const source = latest ? ORIGIN_LABEL[originOf(latest)] : 'Statement import';
  const code = latest?.reference ?? 'TK2H8L3M9P';
  const alloc = allocatePayment(amount);

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader href="/m/tenant" label="Back to home" title="Receipt" />
      <div className="flex flex-col gap-4 p-4">
        <section role="status" className="flex flex-col items-center gap-1.5 text-center">
          <div
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-ok-soft text-3xl text-ok"
          >
            ✓
          </div>
          <h2 className="m-0 mt-1.5 text-lg font-extrabold text-ok">Payment received</h2>
          <p className="m-0 font-mono text-[32px] font-medium tracking-[-1px]">
            <Money minor={amount} />
          </p>
          <p className="m-0 text-[13px] text-muted">2 November 2026 · 09:41</p>
        </section>

        <section
          aria-label="Payment details"
          className="rounded-card border border-border bg-surface px-4 py-1 text-sm"
        >
          {[
            [
              'Reference',
              <span key="c" className="font-mono">
                {code}
              </span>,
            ],
            ['Source', source],
            ['Paid to', LANDLORD_NAME],
            [
              'Account',
              <span key="p" className="font-mono">
                {TENANT_ACCOUNT}
              </span>,
            ],
            ['Paid from', tenant ? <MaskedText key="m" kind="phone" value={tenant.phone} /> : '—'],
          ].map(([label, value], i) => (
            <div
              key={String(label)}
              className={`flex items-center justify-between gap-3 py-3 ${i ? 'border-t border-divider' : ''}`}
            >
              <span className="text-muted">{label}</span>
              <span className="text-right font-bold">{value}</span>
            </div>
          ))}
        </section>

        <section
          aria-labelledby="alloc"
          className="rounded-card border border-border bg-surface p-4 text-sm"
        >
          <h3 id="alloc" className="m-0 mb-2 text-sm font-extrabold">
            Allocated to
          </h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {alloc.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-3">
                <span>{l.label}</span>
                <Money minor={l.amount} prefix={false} />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-divider pt-2.5 font-extrabold">
            <span>New balance</span>
            <Money
              minor={alloc.newBalance}
              className="rounded-full bg-ok-soft px-2.5 py-1 text-ok"
            />
          </div>
        </section>

        <p className="m-0 text-center text-xs leading-normal text-muted">
          Your money went directly to your landlord. Kodibox never holds it. A copy was sent
          {tenant ? ' to ' : ''}
          {tenant ? <MaskedText kind="phone" value={tenant.phone} /> : null} by SMS.
        </p>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => toast('Receipt ready to share (demo)', 'info')}
            >
              Share
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast('Receipt PDF downloaded (demo)', 'ok')}
            >
              Download PDF
            </Button>
          </div>
          <LinkButton href="/m/tenant" size="lg">
            Back home
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
