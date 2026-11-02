'use client';

import Link from 'next/link';
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
  Money,
  Select,
  Switch,
  Checkbox,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
  type Tone,
} from '@/components/ui';
import { getLandlord, listExpenses, listProperties, type Expense } from '@/demo';
import { formatDate } from '@/demo/format';
import { PRIORITY_LABEL, listWorkOrders, type WorkOrder, type WorkOrderColumn } from '@/demo/ops';
import { useDemoStore } from '@/demo/store';
import { kes } from '@/lib/money';

const COLUMNS: { id: WorkOrderColumn; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];
const TICKET_STATUS = {
  new: 'new',
  assigned: 'assigned',
  in_progress: 'in_progress',
  done: 'resolved',
} as const;
const PRIORITY_TONE: Record<string, Tone> = {
  urgent: 'danger',
  high: 'warn',
  normal: 'info',
  low: 'neutral',
};
const CATEGORIES: Expense['category'][] = [
  'repairs',
  'utilities',
  'security',
  'cleaning',
  'insurance',
  'other',
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface ExpenseRow extends Expense {
  recharge: boolean;
  receipt: boolean;
}

export function MaintenanceView() {
  const { data, actions } = useDemoStore();
  const { toast } = useToast();
  const properties = listProperties(data);
  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? id;

  const [orders, setOrders] = useState<WorkOrder[]>(() => listWorkOrders(data));
  const [expenses, setExpenses] = useState<ExpenseRow[]>(() =>
    listExpenses(undefined, data).map((e, i) => ({
      ...e,
      recharge: e.id === 'exp_1',
      receipt: i % 4 !== 3,
    })),
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    propertyId: 'prop_riverside',
    category: 'repairs' as Expense['category'],
    vendor: '',
    description: '',
    amount: '',
    date: '2026-11-02',
    receipt: false,
    recharge: false,
  });
  const [error, setError] = useState('');

  function move(o: WorkOrder, dir: 1 | -1) {
    const idx = COLUMNS.findIndex((c) => c.id === o.column) + dir;
    const target = COLUMNS[idx];
    if (!target) return;
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, column: target.id } : x)));
    actions.updateTicketStatus(o.ticketId, TICKET_STATUS[target.id]);
    toast(`${o.number} moved to ${target.label}.`, 'ok');
  }

  function save() {
    const amount = Number(form.amount);
    if (!form.vendor.trim() || !form.description.trim() || !(amount > 0)) {
      setError('Enter a vendor, a description and an amount above zero.');
      return;
    }
    const row: ExpenseRow = {
      id: `exp_new_${expenses.length + 1}`,
      propertyId: form.propertyId,
      category: form.category,
      description: form.description.trim(),
      vendor: form.vendor.trim(),
      amount: kes(amount),
      date: form.date,
      status: 'pending',
      recharge: form.recharge,
      receipt: form.receipt,
    };
    setExpenses((prev) => [row, ...prev]);
    setOpen(false);
    setError('');
    setForm({ ...form, vendor: '', description: '', amount: '', receipt: false, recharge: false });
    toast(
      form.recharge
        ? 'Expense added. It will appear as a separate line on the tenant next invoice.'
        : 'Expense added.',
      'ok',
    );
  }

  const november = expenses.filter((e) => e.date.startsWith('2026-11'));
  const byProperty = properties
    .map((p) => ({
      p,
      total: november.filter((e) => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0),
      count: november.filter((e) => e.propertyId === p.id).length,
    }))
    .filter((x) => x.count > 0);
  const grand = byProperty.reduce((s, x) => s + x.total, 0);
  const max = Math.max(1, ...byProperty.map((x) => x.total));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Expenses & repairs"
        eyebrow="All properties · November 2026"
        actions={<Button onClick={() => setOpen(true)}>Add expense</Button>}
      />

      <section aria-labelledby="wo-h">
        <h2 id="wo-h" className="m-0 mb-3 text-[17px] font-bold">
          Maintenance requests
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((c, ci) => {
            const items = orders.filter((o) => o.column === c.id);
            return (
              <div key={c.id} className="flex flex-col gap-3 rounded-card bg-soft p-3">
                <h3 className="m-0 flex items-center justify-between text-sm font-bold">
                  {c.label}
                  <Badge tone="neutral">{items.length}</Badge>
                </h3>
                {items.length === 0 ? (
                  <p className="m-0 text-sm text-muted">Nothing here.</p>
                ) : null}
                {items.map((o) => (
                  <article
                    key={o.id}
                    className="flex flex-col gap-1.5 rounded-control border border-border bg-surface p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold">{o.where}</span>
                      <Badge tone={PRIORITY_TONE[o.priority] ?? 'neutral'}>
                        {PRIORITY_LABEL[o.priority]}
                      </Badge>
                    </div>
                    <Link
                      href={`/tickets/${o.ticketId}`}
                      className="text-[15px] font-semibold text-text underline"
                    >
                      {o.title}
                    </Link>
                    <span className="text-xs text-muted">{o.by}</span>
                    <span className="text-xs text-muted">{o.vendor}</span>
                    <div className="mt-1 flex gap-2">
                      {ci > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${o.number} back to ${COLUMNS[ci - 1]?.label}`}
                          onClick={() => move(o, -1)}
                        >
                          Back
                        </Button>
                      ) : null}
                      {ci < COLUMNS.length - 1 ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Move ${o.number} to ${COLUMNS[ci + 1]?.label}`}
                          onClick={() => move(o, 1)}
                        >
                          Move to {COLUMNS[ci + 1]?.label}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader
          title="Expenses"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast('Export prepared for landlords (demo).', 'ok')}
            >
              Export for landlords
            </Button>
          }
        />
        <Table minWidth={820}>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Property</TH>
              <TH>Category</TH>
              <TH>Vendor</TH>
              <TH align="right">Amount</TH>
              <TH>Receipt</TH>
              <TH>Recharge tenant</TH>
              <TH>Landlord</TH>
            </TR>
          </THead>
          <TBody>
            {expenses.map((e) => {
              const prop = properties.find((p) => p.id === e.propertyId);
              return (
                <TR key={e.id}>
                  <TD>{formatDate(e.date)}</TD>
                  <TD>{propName(e.propertyId)}</TD>
                  <TD>{cap(e.category)}</TD>
                  <TD>
                    {e.vendor}
                    <span className="block text-xs text-muted">{e.description}</span>
                  </TD>
                  <TD align="right">
                    <Money minor={e.amount} />
                  </TD>
                  <TD>
                    <Badge tone={e.receipt ? 'ok' : 'danger'}>
                      {e.receipt ? 'Attached' : 'Missing'}
                    </Badge>
                  </TD>
                  <TD>{e.recharge ? <Badge tone="info">Yes</Badge> : 'No'}</TD>
                  <TD>{prop ? (getLandlord(prop.landlordId, data)?.name ?? '-') : '-'}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <p className="m-0 mt-3 text-xs text-muted">
          Recharged items are added to the tenant&apos;s next invoice as a separate line. Edits are
          kept as reversals in the audit log, never deleted.
        </p>
      </Card>

      <Card>
        <CardHeader title="November expenses by property" />
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {byProperty.map((x) => (
            <li key={x.p.id}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{x.p.name}</span>
                <Money minor={x.total} />
              </div>
              <div
                className="mt-1 h-2 rounded-full bg-divider"
                role="img"
                aria-label={`${x.p.name} share of the largest property`}
              >
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${Math.round((x.total / max) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted">{x.count} expenses</span>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-3 text-sm font-bold">
          Total <Money minor={grand} />
        </p>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add expense"
        description="Record money you spent on a property. Kodibox does not pay vendors."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save expense</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Property" htmlFor="ex-prop">
            <Select
              id="ex-prop"
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" htmlFor="ex-cat">
            <Select
              id="ex-cat"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as Expense['category'] })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {cap(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vendor" htmlFor="ex-vendor">
            <Input
              id="ex-vendor"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </Field>
          <Field label="Amount (KES)" htmlFor="ex-amt">
            <Input
              id="ex-amt"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Description" htmlFor="ex-desc" className="sm:col-span-2">
            <Input
              id="ex-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Date" htmlFor="ex-date">
            <Input
              id="ex-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Checkbox
            label="Receipt attached"
            checked={form.receipt}
            onChange={(e) => setForm({ ...form, receipt: e.target.checked })}
          />
        </div>
        <Switch
          label="Recharge to tenant (added to their next invoice as a separate line)"
          checked={form.recharge}
          onChange={(e) => setForm({ ...form, recharge: e.target.checked })}
        />
        {error ? (
          <p role="alert" className="m-0 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
