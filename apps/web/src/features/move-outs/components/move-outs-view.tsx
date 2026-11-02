'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  Field,
  Input,
  MaskedText,
  Money,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { listLeases, listNotices, listUnits, getProperty, getTenant } from '@/demo';
import { formatDate } from '@/demo/format';
import {
  DEDUCTIONS,
  INSPECTION,
  MOVE_OUT_TENANT_ID,
  RENT_INCREASE_NOTICES,
  daysUntil,
  refundAmount,
  type NoticeRow,
} from '@/demo/ops';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';
import { kes } from '@/lib/money';

const KIND_LABEL = {
  vacate: 'Vacation notice',
  lease_end: 'Lease end',
  rent_increase: 'Rent increase',
} as const;
const KIND_TONE = { vacate: 'info', lease_end: 'ok', rent_increase: 'warn' } as const;

export function MoveOutsView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const tenant = getTenant(MOVE_OUT_TENANT_ID, data);
  const lease = listLeases(data).find((l) => l.tenantId === MOVE_OUT_TENANT_ID);
  const held = lease?.deposit ?? kes(28000);

  const [deductions, setDeductions] = useState(DEDUCTIONS);
  const [editing, setEditing] = useState(false);
  const [sent, setSent] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [kind, setKind] = useState('rent_increase');

  const rows: NoticeRow[] = [
    ...listNotices(data)
      .filter((n) => n.kind !== 'rent_increase')
      .map((n): NoticeRow => {
        const unit = listUnits(n.propertyId, data).find((u) => u.id === n.unitId);
        const t = getTenant(n.tenantId, data);
        const left = daysUntil(n.effectiveDate);
        return {
          id: n.id,
          kind: KIND_LABEL[n.kind],
          tone: KIND_TONE[n.kind],
          counter: left >= 0 ? `${left} days left` : 'Ended',
          title: `${unit?.code ?? ''} ${getProperty(n.propertyId, data)?.name ?? ''} · ${t?.tenant.name ?? ''}`,
          sub: `Given ${formatDate(n.issuedAt)}. Ends ${formatDate(n.effectiveDate)}. Status: ${n.status}.`,
        };
      }),
    ...RENT_INCREASE_NOTICES,
  ];

  const refund = refundAmount(held, deductions);
  const total = deductions.reduce((s, d) => s + d.amount, 0);
  const overdrawn = total > held;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notices & move-outs"
        eyebrow={`${rows.filter((r) => r.kind === 'Vacation notice').length} vacation notices · ${rows.filter((r) => r.kind === 'Rent increase').length} rent-increase notices`}
        actions={<Button onClick={() => setTemplateOpen(true)}>New notice from template</Button>}
      />

      <Card>
        <CardHeader title="Notices" />
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((n) => (
            <li
              key={n.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-divider py-3 first:border-t-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={n.tone}>{n.kind}</Badge>
                  <span className="text-sm font-bold">{n.counter}</span>
                </div>
                <p className="m-0 mt-1 text-[15px] font-semibold">{n.title}</p>
                <p className="m-0 text-sm text-muted">{n.sub}</p>
              </div>
              {n.kind === 'Rent increase' && n.counter === 'Draft' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toast('Review the advocate template, then send (demo).', 'info')}
                >
                  Review and send
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="m-0 mt-3 rounded-control bg-soft px-3 py-2 text-sm">
          Advocate-reviewed templates. Rent-increase notices use wording reviewed by an advocate,
          with the notice period set by each lease. Kodibox offers lawful notices only. There are no
          lockout or eviction tools.
        </p>
      </Card>

      <Card>
        <CardHeader title="Move-out · A-07 Riverside Court" />
        <p className="m-0 text-sm text-muted">
          Tenant: {tenant?.tenant.name ?? 'Tenant'} · ID{' '}
          <MaskedText kind="id" value={tenant?.tenant.nationalId ?? ''} /> · moves out{' '}
          {lease ? formatDate(lease.endDate) : '30 Nov 2026'}
        </p>
        <p className="m-0 mt-2">
          <Badge tone={sent ? 'ok' : 'warn'}>
            {sent ? 'Statement sent to tenant' : 'Inspection done · statement pending'}
          </Badge>
        </p>

        <h3 className="m-0 mt-5 text-[15px] font-bold">
          Inspection checklist · by caretaker Grace Njoki, 1 Nov
        </h3>
        <Table minWidth={560}>
          <THead>
            <TR>
              <TH>Room</TH>
              <TH>Condition</TH>
              <TH>Note</TH>
              <TH align="right">Photos</TH>
            </TR>
          </THead>
          <TBody>
            {INSPECTION.map((r) => (
              <TR key={r.room}>
                <TD className="font-semibold">{r.room}</TD>
                <TD>
                  <Badge tone={r.tone}>{r.condition}</Badge>
                </TD>
                <TD>{r.note}</TD>
                <TD align="right">{r.photos}</TD>
              </TR>
            ))}
          </TBody>
        </Table>

        <h3 className="m-0 mt-5 text-[15px] font-bold">Deposit refund statement</h3>
        <dl className="m-0 mt-2 flex flex-col gap-2 text-[15px]">
          <div className="flex justify-between gap-3">
            <dt>Deposit held</dt>
            <dd className="m-0">
              <Money minor={held} />
            </dd>
          </div>
          {deductions.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3">
              <dt>Less: {d.label}</dt>
              <dd className="m-0">
                {editing ? (
                  <Input
                    aria-label={`Amount for ${d.label} (KES)`}
                    inputMode="decimal"
                    className="w-32 text-right"
                    value={String(d.amount / 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDeductions((prev) =>
                        prev.map((x) =>
                          x.id === d.id
                            ? { ...x, amount: kes(Number.isFinite(v) && v >= 0 ? v : 0) }
                            : x,
                        ),
                      );
                    }}
                  />
                ) : (
                  <>
                    - <Money minor={d.amount} />
                  </>
                )}
              </dd>
            </div>
          ))}
          <div
            className={cn(
              'flex justify-between gap-3 border-t border-border-strong pt-2 text-lg font-extrabold',
            )}
          >
            <dt>Refund to tenant</dt>
            <dd className="m-0">
              <Money minor={refund} />
            </dd>
          </div>
        </dl>
        {overdrawn ? (
          <p role="alert" className="m-0 mt-2 text-sm font-medium text-danger">
            Deductions exceed the deposit held. The refund is shown as zero.
          </p>
        ) : null}
        <p className="m-0 mt-3 rounded-control bg-brand-tint px-3 py-2 text-sm">
          You pay the refund from your own account. Kodibox records it and keeps the audit trail; it
          never holds or moves the deposit.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" disabled={sent} onClick={() => setEditing((v) => !v)}>
            {editing ? 'Done editing' : 'Edit deductions'}
          </Button>
          <Button
            disabled={sent || editing}
            onClick={() => {
              setSent(true);
              toast('Statement approved and sent to the tenant. Logged in the audit trail.', 'ok');
            }}
          >
            {sent ? 'Statement sent' : 'Approve & send statement to tenant'}
          </Button>
        </div>
        <p className="m-0 mt-3 text-xs text-muted">
          The tenant can dispute any line from their app within 14 days. Disputes are logged, not
          deleted.
        </p>
      </Card>

      <Dialog
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        title="New notice from template"
        description="Templates are reviewed by an advocate. The notice period comes from the lease."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setTemplateOpen(false);
                toast('Draft notice created. Review it before sending.', 'ok');
              }}
            >
              Create draft
            </Button>
          </>
        }
      >
        <Field label="Notice type" htmlFor="nt-kind">
          <Select id="nt-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="rent_increase">Rent increase</option>
            <option value="vacate">Vacation notice (recorded from tenant)</option>
            <option value="lease_end">Lease end / renewal offer</option>
          </Select>
        </Field>
      </Dialog>
    </div>
  );
}
