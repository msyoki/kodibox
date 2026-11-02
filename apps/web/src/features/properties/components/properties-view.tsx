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
  ProgressBar,
  Select,
  useToast,
} from '@/components/ui';
import type { PropertyCard } from '@/demo/properties-tenants';
import type { PropertyKind } from '@/demo';

export function PropertiesView({ properties }: { properties: PropertyCard[] }) {
  const { toast } = useToast();
  const [added, setAdded] = useState<PropertyCard[]>([]);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | PropertyKind>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', area: '', kind: 'residential' as PropertyKind });
  const [error, setError] = useState('');

  const all = [...properties, ...added];
  const shown = all.filter(
    (p) =>
      (kind === 'all' || p.kind === kind) &&
      (!q.trim() || `${p.name} ${p.area}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const units = all.reduce((s, p) => s + p.unitCount, 0);
  const occupied = all.reduce((s, p) => s + p.occupied, 0);
  const pct = units ? ((occupied / units) * 100).toFixed(1) : '0';

  function addProperty() {
    if (!form.name.trim()) {
      setError('Enter a property name.');
      return;
    }
    const id = `local_${added.length + 1}`;
    setAdded((a) => [
      ...a,
      {
        id,
        orgId: 'org_1',
        name: form.name.trim(),
        area: form.area.trim() || 'Area not set',
        kind: form.kind,
        landlordId: '',
        caretaker: '',
        unitCount: 0,
        occupied: 0,
        vacant: 0,
        expected: 0,
        collected: 0,
        outstanding: 0,
        collectedPct: 0,
        landlordName: 'Unassigned',
      },
    ]);
    toast(`Property "${form.name.trim()}" added. Add units next.`, 'ok');
    setForm({ name: '', area: '', kind: 'residential' });
    setError('');
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Properties & units"
        eyebrow={`${all.length} properties · ${units} units · ${pct}% occupied`}
        actions={
          <>
            <LinkButton href="/properties/import" variant="secondary">
              Bulk import
            </LinkButton>
            <Button onClick={() => setOpen(true)}>Add property</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search properties" htmlFor="prop-q" className="min-w-56 flex-1">
          <Input
            id="prop-q"
            type="search"
            placeholder="Name or area"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Field>
        <Field label="Type" htmlFor="prop-kind" className="w-44">
          <Select
            id="prop-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as 'all' | PropertyKind)}
          >
            <option value="all">All</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </Select>
        </Field>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No properties match" description="Try a different search or filter." />
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const occPct = p.unitCount ? Math.round((p.occupied / p.unitCount) * 100) : 0;
            return (
              <li key={p.id}>
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="m-0 text-[17px] font-bold">{p.name}</h2>
                      <p className="m-0 text-sm text-muted">{p.area}</p>
                    </div>
                    <Badge tone={p.kind === 'commercial' ? 'warn' : 'info'}>
                      {p.kind === 'commercial' ? 'Commercial' : 'Residential'}
                    </Badge>
                  </div>
                  <p className="m-0 text-sm">
                    <strong>{p.unitCount} units</strong> · {p.occupied} of {p.unitCount} occupied
                  </p>
                  <ProgressBar
                    value={occPct}
                    tone={p.kind === 'commercial' ? 'warning' : 'brand'}
                    label={`${p.name} occupancy ${occPct}%`}
                  />
                  <p className="m-0 text-sm text-muted">Landlord: {p.landlordName}</p>
                  <div className="mt-auto pt-1">
                    {p.id.startsWith('local_') ? (
                      <span className="text-sm text-muted">Demo only, not saved</span>
                    ) : (
                      <Link
                        href={`/properties/${p.id}`}
                        className="inline-flex min-h-11 items-center text-sm font-bold text-brand"
                      >
                        View units
                        <span className="sr-only"> for {p.name}</span> &rarr;
                      </Link>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add property"
        description="Rent goes straight to your paybill or bank account. Kodibox never holds money."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addProperty}>Add property</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Property name" htmlFor="np-name" error={error}>
            <Input
              id="np-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Area" htmlFor="np-area">
            <Input
              id="np-area"
              placeholder="e.g. Kilimani, Nairobi"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
          </Field>
          <Field label="Type" htmlFor="np-kind">
            <Select
              id="np-kind"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as PropertyKind })}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
