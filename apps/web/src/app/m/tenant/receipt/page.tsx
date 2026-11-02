'use client';

import { LinkButton, Button, MaskedText, Money, useToast } from '@/components/ui';
import { BackHeader } from '@/components/tenant-app/bits';
import { useTenantLocal } from '@/components/tenant-app/local-state';
import { DEMO_TENANT_ID } from '@/demo';
import { useDemoStore } from '@/demo/store';
import {
  BALANCE,
  LANDLORD_NAME,
  PAYBILL_PLACEHOLDER,
  TENANT_ACCOUNT,
  allocatePayment,
} from '@/demo/tenant-app';

export default function TenantReceiptPage() {
  const { data } = useDemoStore();
  const { lastPayment } = useTenantLocal();
  const { toast } = useToast();
  const tenant = data.tenants.find((t) => t.id === DEMO_TENANT_ID);
  const amount = lastPayment ?? BALANCE;
  const alloc = allocatePayment(amount);

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader href="/m/tenant" label="Back to home" title="Receipt" />
      <div className="flex flex-col gap-4 p-4">
        <section
          role="status"
          className="flex flex-col items-center gap-1 rounded-panel border border-ok bg-ok-soft p-5 text-center"
        >
          <div
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-full bg-ok text-xl text-white"
          >
            ✓
          </div>
          <h2 className="m-0 text-lg font-extrabold text-ok">Payment received</h2>
          <p className="m-0 text-3xl font-extrabold">
            <Money minor={amount} />
          </p>
          <p className="m-0 text-sm text-muted">2 November 2026 · 09:41</p>
        </section>

        <section
          aria-label="Payment details"
          className="rounded-card border border-border bg-surface px-4 text-sm"
        >
          {[
            [
              'M-Pesa code',
              <span key="c" className="font-mono">
                TK2H8L3M9P
              </span>,
            ],
            ['Paid to', LANDLORD_NAME],
            [
              'Paybill / account',
              <span key="p" className="font-mono">
                {PAYBILL_PLACEHOLDER} · {TENANT_ACCOUNT}
              </span>,
            ],
            ['Paid from', tenant ? <MaskedText key="m" kind="phone" value={tenant.phone} /> : '—'],
          ].map(([label, value], i) => (
            <div
              key={String(label)}
              className={`flex justify-between gap-3 py-2.5 ${i ? 'border-t border-divider' : ''}`}
            >
              <span className="text-muted">{label}</span>
              <span className="text-right font-semibold">{value}</span>
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
          <div className="mt-3 flex justify-between border-t border-divider pt-3 font-extrabold">
            <span>New balance</span>
            <Money minor={alloc.newBalance} />
          </div>
        </section>

        <p className="m-0 text-xs text-muted">
          Your money went directly to your landlord’s paybill. Kodibox never holds it. A copy was
          sent{tenant ? ' to ' : ''}
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
