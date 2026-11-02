'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Input,
  LinkButton,
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
import type { PropertySummary, UnitRow, UnitStatus } from '@/demo';
import { kes } from '@/lib/money';

const STATUS_TONE = { occupied: 'ok', vacant: 'info', notice: 'warn' } as const;
const STATUS_LABEL: Record<UnitStatus, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  notice: 'Notice',
};

export function PropertyDetail({
  property,
  landlordName,
  units,
}: {
  property: PropertySummary;
  landlordName: string;
  units: UnitRow[];
}) {
  const { toast } = useToast();
  const [added, setAdded] = useState<UnitRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | UnitStatus>('all');
  const [type, setType] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ prefix: '', from: '1', count: '1', type: '1BR', rent: '' });
  const [error, setError] = useState('');

  const all = [...units, ...added];
  const types = Array.from(new Set(all.map((u) => u.type))).sort();
  const shown = all.filter(
    (u) =>
      (status === 'all' || u.status === status) &&
      (type === 'all' || u.type === type) &&
      (!q.trim() ||
        `${u.code} ${u.tenantName ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

  function addUnits() {
    const count = Number(form.count);
    const from = Number(form.from);
    const rent = Number(form.rent);
    if (!form.prefix.trim()) return setError('Enter a unit code prefix, for example D-.');
    if (!Number.isInteger(count) || count < 1 || count > 50)
      return setError('Add between 1 and 50 units at a time.');
    if (!Number.isInteger(from) || from < 0) return setError('Start number must be 0 or more.');
    if (!(rent > 0)) return setError('Enter the monthly rent in KES.');
    const created: UnitRow[] = Array.from({ length: count }, (_, i) => {
      const code = `${form.prefix.trim()}${String(from + i).padStart(2, '0')}`;
      return {
        id: `local_${code}`,
        propertyId: property.id,
        code,
        type: form.type,
        rent: kes(rent),
        serviceCharge: 0,
        status: 'vacant',
        balance: 0,
      };
    });
    const existing = new Set(all.map((u) => u.code));
    const dup = created.find((u) => existing.has(u.code));
    if (dup)
      return setError(`Unit code ${dup.code} already exists. Unit codes are unique per property.`);
    setAdded((a) => [...a, ...created]);
    toast(`${count} unit${count === 1 ? '' : 's'} added as vacant.`, 'ok');
    setError('');
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={property.name}
        eyebrow={`${property.area} · ${property.kind === 'commercial' ? 'Commercial' : 'Residential'} · Landlord: ${landlordName}`}
        actions={
          <>
            <LinkButton href="/properties" variant="ghost">
              All properties
            </LinkButton>
            <LinkButton href="/properties/import" variant="secondary">
              Bulk import
            </LinkButton>
            <Button onClick={() => setOpen(true)}>Add units</Button>
          </>
        }
      />

      <Card>
        <p className="m-0 text-sm">
          The unit code is the tenant&apos;s M-Pesa account number, for example account{' '}
          <strong className="font-mono">B-12</strong>. Payments go to your own paybill or bank
          account; Kodibox only reconciles them.
        </p>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search units" htmlFor="unit-q" className="min-w-56 flex-1">
          <Input
            id="unit-q"
            type="search"
            placeholder="Unit code or tenant"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Field>
        <Field label="Status" htmlFor="unit-status" className="w-40">
          <Select
            id="unit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | UnitStatus)}
          >
            <option value="all">All</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="notice">Notice</option>
          </Select>
        </Field>
        <Field label="Type" htmlFor="unit-type" className="w-40">
          <Select id="unit-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Card>
        {shown.length === 0 ? (
          <EmptyState title="No units match" description="Clear the filters to see all units." />
        ) : (
          <Table minWidth={720}>
            <THead>
              <TR>
                <TH>Unit / account no.</TH>
                <TH>Type</TH>
                <TH align="right">Rent</TH>
                <TH>Tenant</TH>
                <TH>Status</TH>
                <TH align="right">Balance</TH>
                <TH>Action</TH>
              </TR>
            </THead>
            <TBody>
              {shown.map((u) => (
                <TR key={u.id}>
                  <TD className="font-mono font-semibold">{u.code}</TD>
                  <TD>{u.type}</TD>
                  <TD align="right">
                    <Money minor={u.rent} prefix={false} />
                  </TD>
                  <TD>
                    {u.tenantId ? (
                      <Link href={`/tenants/${u.tenantId}`} className="font-semibold text-brand">
                        {u.tenantName}
                      </Link>
                    ) : (
                      <span className="text-muted">No tenant</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                  </TD>
                  <TD align="right" className={u.balance > 0 ? 'text-danger' : 'text-muted'}>
                    {u.status === 'vacant' ? '-' : <Money minor={u.balance} prefix={false} />}
                  </TD>
                  <TD>
                    {u.tenantId ? (
                      <Link
                        href={`/tenants/${u.tenantId}`}
                        className="inline-flex min-h-11 items-center font-semibold text-brand"
                      >
                        Open lease
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast(`Vacancy for ${u.code} listed (demo).`, 'info')}
                      >
                        List vacancy
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <p className="mt-3 mb-0 text-xs text-muted">
          Showing {shown.length} of {all.length} units. Archiving a unit keeps its full ledger
          history. Units are never deleted.
        </p>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add units"
        description="Creates vacant units. Each unit code becomes the M-Pesa account number."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addUnits}>Add units</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code prefix" htmlFor="au-prefix" help="e.g. D-">
            <Input
              id="au-prefix"
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value })}
            />
          </Field>
          <Field label="Start number" htmlFor="au-from">
            <Input
              id="au-from"
              inputMode="numeric"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
            />
          </Field>
          <Field label="How many" htmlFor="au-count">
            <Input
              id="au-count"
              inputMode="numeric"
              value={form.count}
              onChange={(e) => setForm({ ...form, count: e.target.value })}
            />
          </Field>
          <Field label="Type" htmlFor="au-type">
            <Select
              id="au-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {['Bedsitter', '1BR', '2BR', '3BR', 'Shop'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Monthly rent (KES)" htmlFor="au-rent" className="col-span-2" error={error}>
            <Input
              id="au-rent"
              inputMode="numeric"
              value={form.rent}
              onChange={(e) => setForm({ ...form, rent: e.target.value })}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
