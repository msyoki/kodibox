'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, Input, Money, MaskedText, useToast, buttonClasses, Button } from '@/components/ui';
import { ScreenHeader } from '@/components/mobile-ui/screen';
import { DEMO_TENANT_ID, getTenant, listTenants } from '@/demo';
import { formatDate } from '@/demo/format';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';

export function ManagerTenants() {
  const { data, actions } = useDemoStore();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(DEMO_TENANT_ID);

  const rows = useMemo(() => listTenants({ q }, data).slice(0, 8), [q, data]);
  const detail = useMemo(() => getTenant(selectedId, data), [selectedId, data]);

  const lastPayment = detail?.payments
    .filter((p) => p.status === 'matched')
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  const openInvoice = detail?.invoices
    .filter((i) => i.balance > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return (
    <>
      <ScreenHeader title="Tenants" />
      <div className="flex flex-col gap-3 px-4 pt-3">
        <Input
          type="search"
          aria-label="Search tenants"
          placeholder="Search by name or unit"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.length === 0 ? (
            <li className="text-sm text-muted">No tenants match &quot;{q}&quot;.</li>
          ) : null}
          {rows.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={t.id === selectedId}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-card border px-3 py-2 text-left',
                  t.id === selectedId
                    ? 'border-brand bg-brand-tint'
                    : 'border-border bg-surface hover:bg-divider',
                )}
              >
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">{t.name}</strong>
                  <span className="text-xs text-muted">
                    {t.unitCode} · {t.propertyName}
                  </span>
                </span>
                <span className={cn('text-sm', t.balance > 0 ? 'font-bold text-warn' : 'text-ok')}>
                  <Money minor={t.balance} prefix={false} />
                </span>
              </button>
            </li>
          ))}
        </ul>

        {detail ? (
          <section aria-labelledby="qc">
            <Card className="flex flex-col gap-3">
              <div>
                <h2 id="qc" className="m-0 text-lg font-extrabold">
                  {detail.tenant.name}
                </h2>
                <p className="m-0 text-sm text-muted">
                  {detail.unit.code} · {detail.property.name} ·{' '}
                  <MaskedText kind="phone" value={detail.tenant.phone} />
                </p>
                {openInvoice ? (
                  <p className="m-0 mt-1 text-xs font-semibold text-warn">
                    Due {formatDate(openInvoice.dueDate)}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted">Balance</span>
                  <strong className="block">
                    <Money minor={detail.tenant.balance} />
                  </strong>
                </div>
                <div>
                  <span className="text-muted">Last payment</span>
                  <strong className="block">
                    {lastPayment ? <Money minor={lastPayment.amount} prefix={false} /> : 'None yet'}
                  </strong>
                  {lastPayment ? (
                    <span className="text-xs text-muted">
                      {formatDate(lastPayment.receivedAt)} · {lastPayment.reference}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => toast(`Calling ${detail.tenant.name}...`)}
                >
                  Call
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    detail.tenant.smsOptOut
                      ? toast(`${detail.tenant.name} opted out of SMS. Use a call instead.`, 'warn')
                      : toast(`SMS composer opened for ${detail.tenant.name}`)
                  }
                >
                  SMS
                </Button>
              </div>
              <Button
                disabled={detail.tenant.balance <= 0}
                onClick={() => {
                  if (detail.tenant.smsOptOut) {
                    toast(`${detail.tenant.name} opted out of SMS. Use a call instead.`, 'warn');
                    return;
                  }
                  actions.logAudit(
                    'reminder.sent',
                    detail.tenant.id,
                    `Payment reminder SMS sent to ${detail.tenant.name}`,
                  );
                  toast(
                    `Reminder sent to ${detail.tenant.name} with pay instructions and account reference.`,
                    'ok',
                  );
                }}
              >
                {detail.tenant.balance > 0 ? (
                  <>
                    Send payment reminder for <Money minor={detail.tenant.balance} />
                  </>
                ) : (
                  'No balance to remind'
                )}
              </Button>
              <Link href="/tenants" className={buttonClasses('ghost', 'md', 'w-full')}>
                View statement
              </Link>
            </Card>
          </section>
        ) : null}
      </div>
    </>
  );
}
