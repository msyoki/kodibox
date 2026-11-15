'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Money,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { listCommercialExcluded, listMriRows, mriTax, MRI_DEFAULT_RATE_PCT } from '@/demo/agency';
import { useDemoStore } from '@/demo/store';

const REPORTS = [
  {
    title: 'Rent roll',
    desc: 'Every unit, tenant, rent, deposit held and lease dates as at today.',
  },
  {
    title: 'Arrears aging',
    desc: 'Balances by 0-30, 31-60, 61-90 and 90+ days, per tenant and property.',
  },
  {
    title: 'Collections by property',
    desc: 'Expected vs collected for any month, with channel and unmatched amounts.',
  },
  {
    title: 'Income & expenses',
    desc: 'Rent, utilities and repair costs per property, ready for landlord statements.',
  },
  {
    title: 'Tenant statements',
    desc: 'Full ledger per tenant: charges, payments, reversals and running balance.',
  },
  { title: 'Occupancy', desc: 'Vacant, occupied and notice-to-vacate units with days vacant.' },
  {
    title: 'Payment channel mix',
    desc: 'Share of M-Pesa paybill or till, bank transfer and cash, by month.',
  },
];

export function ReportsView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const [rateText, setRateText] = useState(String(MRI_DEFAULT_RATE_PCT));
  const rate = Number.isFinite(Number(rateText)) && rateText !== '' ? Number(rateText) : 0;

  const rows = listMriRows(data);
  const excluded = listCommercialExcluded(data);
  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totalTax = rows.reduce((s, r) => s + mriTax(r.gross, rate), 0);

  const logExport = (name: string, fmt: string) =>
    toast(`Export logged: ${name} (${fmt}) by Wanjiru Mwangi, 2 Nov 2026`, 'ok');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports & tax" eyebrow="Mwangi Properties · 4 properties · 150 units" />

      <Card aria-labelledby="mri" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge tone="info">Featured</Badge>
            <h2 id="mri" className="m-0 mt-2 text-xl font-extrabold">
              Monthly Rental Income (MRI) tax · October 2026
            </h2>
            <p className="m-0 text-sm text-muted">
              One return figure per landlord. Residential rent actually received in October.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Filing due</div>
            <div className="text-lg font-extrabold">20 Nov 2026</div>
            <div className="text-[13px] font-semibold text-warn">18 days left</div>
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <div className="flex min-w-[200px] flex-[1_1_200px] flex-col gap-1 rounded-control border border-divider bg-soft px-3.5 py-3 text-[13px] text-muted">
            <Field
              label="Tax rate (%) as configured"
              htmlFor="mri-rate"
              help="Rate as configured — verify with KRA"
            >
              <Input
                id="mri-rate"
                inputMode="decimal"
                className="w-24 font-mono"
                value={rateText}
                onChange={(e) => setRateText(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </Field>
          </div>
          <div className="flex min-w-[200px] flex-[1_1_200px] flex-col gap-1 rounded-control border border-divider bg-soft px-3.5 py-3 text-[13px] text-muted">
            Gross residential rent received
            <strong className="font-mono text-[22px] font-medium text-text">
              <Money minor={totalGross} />
            </strong>
            <span>
              {rows.length} landlords · {rows.length} residential properties
            </span>
          </div>
          <div className="flex min-w-[200px] flex-[1_1_200px] flex-col gap-1 rounded-control border border-bar-track bg-brand-soft px-3.5 py-3 text-[13px] text-link">
            Tax payable (total)
            <strong className="font-mono text-[22px] font-medium">
              <Money minor={totalTax} />
            </strong>
            <span>Payable by each landlord to KRA</span>
          </div>
        </div>

        <Table minWidth={640}>
          <THead>
            <TR>
              <TH>Landlord</TH>
              <TH>Property</TH>
              <TH align="right">Gross residential rent</TH>
              <TH align="right">Rate</TH>
              <TH align="right">Tax payable</TH>
              <TH>Due</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.landlord.id}>
                <TD className="font-semibold">{r.landlord.name}</TD>
                <TD>{r.propertyNames}</TD>
                <TD align="right">
                  <Money minor={r.gross} />
                </TD>
                <TD align="right">{rate}%</TD>
                <TD align="right">
                  <Money minor={mriTax(r.gross, rate)} />
                </TD>
                <TD>20 Nov</TD>
              </TR>
            ))}
          </TBody>
        </Table>

        <div className="flex flex-wrap items-stretch gap-3">
          <div className="min-w-[240px] flex-[1_1_280px] rounded-control bg-warn-soft px-3.5 py-3 text-[13px] leading-normal text-warn">
            <strong className="block">Commercial units excluded</strong>
            {excluded.map((e) => (
              <span key={e.propertyNames}>
                {e.propertyNames} is commercial (<Money minor={e.gross} /> received) and is not part
                of MRI. Handle it under the landlord&apos;s other tax treatment.{' '}
              </span>
            ))}
          </div>
          <div className="min-w-[240px] flex-[1_1_280px] rounded-control bg-ok-soft px-3.5 py-3 text-[13px] leading-normal text-ok">
            <strong className="block">eTIMS-ready receipts: 131 of 134 payments</strong>3 October
            payments have no receipt yet (cash, awaiting approval). Approve them first so they are
            included.
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => logExport('MRI October 2026, iTax file', 'CSV')}>
            Download for iTax
          </Button>
          <Button
            variant="secondary"
            onClick={() => logExport('MRI October 2026, landlord copies', 'PDF')}
          >
            Landlord copies (PDF)
          </Button>
        </div>
        <p className="m-0 text-xs text-muted">
          Kodibox prepares the figures only. Filing and payment happen on iTax, with each
          landlord&apos;s own PIN.
        </p>
      </Card>

      <section aria-labelledby="all-reports" className="flex flex-col gap-3">
        <div>
          <h2 id="all-reports" className="m-0 text-[17px] font-bold">
            All reports
          </h2>
          <p className="m-0 text-sm text-muted">
            Every export is logged with who, when and which filters.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {REPORTS.map((r) => (
            <Card key={r.title} className="flex flex-col gap-3">
              <div>
                <h3 className="m-0 text-[15px] font-bold">{r.title}</h3>
                <p className="m-0 text-sm text-muted">{r.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['CSV', 'Excel', 'PDF'].map((f) => (
                  <Button
                    key={f}
                    variant="secondary"
                    size="sm"
                    onClick={() => logExport(r.title, f)}
                  >
                    {f}
                    <span className="sr-only"> export of {r.title}</span>
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
