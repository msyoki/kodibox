'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  MaskedText,
  Money,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import type { TenantRow } from '@/demo';

export function TenantsList({
  tenants,
  properties,
}: {
  tenants: TenantRow[];
  properties: { id: string; name: string }[];
}) {
  const [q, setQ] = useState('');
  const [propertyId, setPropertyId] = useState('all');
  const [status, setStatus] = useState<'all' | 'arrears' | 'paid'>('all');

  const needle = q.trim().toLowerCase();
  const shown = tenants.filter(
    (t) =>
      (propertyId === 'all' || t.propertyId === propertyId) &&
      (status === 'all' || (status === 'arrears' ? t.balance > 0 : t.balance <= 0)) &&
      (!needle || `${t.name} ${t.unitCode}`.toLowerCase().includes(needle)),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tenants & leases"
        eyebrow={`${tenants.length} tenants · phone numbers are masked`}
        actions={
          <LinkButton href="/properties/import" variant="secondary">
            Import tenants
          </LinkButton>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search tenants" htmlFor="ten-q" className="min-w-56 flex-1">
          <Input
            id="ten-q"
            type="search"
            placeholder="Name or unit code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Field>
        <Field label="Property" htmlFor="ten-prop" className="w-52">
          <Select id="ten-prop" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="all">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="ten-status" className="w-44">
          <Select
            id="ten-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | 'arrears' | 'paid')}
          >
            <option value="all">All</option>
            <option value="arrears">In arrears</option>
            <option value="paid">Paid up</option>
          </Select>
        </Field>
      </div>

      <Card>
        {shown.length === 0 ? (
          <EmptyState title="No tenants match" description="Try a different search or filter." />
        ) : (
          <Table minWidth={760}>
            <THead>
              <TR>
                <TH>Tenant</TH>
                <TH>Unit</TH>
                <TH>Property</TH>
                <TH>Phone</TH>
                <TH align="right">Balance</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {shown.map((t) => (
                <TR key={t.id}>
                  <TD>
                    <Link
                      href={`/tenants/${t.id}`}
                      className="inline-flex min-h-11 items-center font-semibold text-brand"
                    >
                      {t.name}
                    </Link>
                  </TD>
                  <TD className="font-mono">{t.unitCode}</TD>
                  <TD>{t.propertyName}</TD>
                  <TD>
                    <MaskedText kind="phone" value={t.phone} />
                  </TD>
                  <TD align="right" className={t.balance > 0 ? 'text-danger' : 'text-muted'}>
                    <Money minor={t.balance} prefix={false} />
                  </TD>
                  <TD>
                    {t.balance > 0 ? (
                      <Badge tone="warn">In arrears</Badge>
                    ) : (
                      <Badge tone="ok">Paid up</Badge>
                    )}
                    {t.smsOptOut ? (
                      <Badge tone="neutral" className="ml-1.5">
                        SMS opted out
                      </Badge>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <p className="mt-3 mb-0 text-xs text-muted">
          Showing {shown.length} of {tenants.length} tenants.
        </p>
      </Card>
    </div>
  );
}
