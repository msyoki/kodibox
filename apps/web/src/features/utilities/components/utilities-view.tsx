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
  Money,
  Select,
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
import { listProperties } from '@/demo';
import { FLAT_WATER_RATE, MVULE_ID, TIERS, listReadingRows } from '@/demo/ops';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';
import { kes } from '@/lib/money';

type Review = 'accepted' | 'sent_back';

function tieredAmount(used: number): number {
  let total = 0;
  for (const t of TIERS) {
    const upper = t.to ?? Infinity;
    const lowerExclusive = t.from === 0 ? 0 : t.from - 1;
    const units = Math.max(0, Math.min(used, upper) - lowerExclusive);
    total += units * t.rate;
  }
  return total;
}

export function UtilitiesView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const properties = listProperties(data).filter((p) => p.kind === 'residential');
  const [propertyId, setPropertyId] = useState(MVULE_ID);
  const [tiered, setTiered] = useState(false);
  const [flatRate, setFlatRate] = useState(String(FLAT_WATER_RATE / 100));
  const [splitBy, setSplitBy] = useState<'occupants' | 'equal'>('occupants');
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvName, setCsvName] = useState('');

  const property = properties.find((p) => p.id === propertyId);
  const rows = listReadingRows(propertyId, data);
  const rate = kes(Number(flatRate) > 0 ? Number(flatRate) : 0);
  const amountOf = (used: number) => (tiered ? tieredAmount(used) : used * rate);
  const recorded = rows.filter((r) => r.current !== null);
  const flagged = recorded.filter((r) => r.flagged);
  const unresolved = flagged.filter((r) => !reviews[r.id]);
  const sentBack = flagged.filter((r) => reviews[r.id] === 'sent_back').length;
  const approvable = recorded.filter((r) => reviews[r.id] !== 'sent_back');
  const isApproved = approved[propertyId] ?? false;
  const totalUsed = recorded.reduce((s, r) => s + (r.used ?? 0), 0);

  const occupants = splitBy === 'occupants' ? 96 : rows.length;
  const poolBill = kes(18900);
  const each = Math.floor(poolBill / occupants);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Utilities"
        eyebrow={`${property?.name ?? ''} · ${property?.area ?? ''} · November 2026`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setCsvOpen(true)}>
              Upload readings CSV
            </Button>
            <Button
              disabled={isApproved || unresolved.length > 0}
              onClick={() => {
                setApproved((a) => ({ ...a, [propertyId]: true }));
                toast(
                  `${approvable.length} readings approved. Charges post to November invoices.`,
                  'ok',
                );
              }}
            >
              {isApproved ? 'Readings approved' : `Approve ${approvable.length} readings`}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader title="Tariff setup" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="m-0 text-[15px] font-bold">
              Water · {tiered ? 'tiered pricing' : 'flat rate'}
            </h3>
            {tiered ? (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                {TIERS.map((t) => (
                  <li
                    key={t.from}
                    className="flex justify-between rounded-control bg-soft px-3 py-2"
                  >
                    <span>
                      {t.to === null ? `Above ${t.from - 1} units` : `${t.from}–${t.to} units`}
                    </span>
                    <Money minor={t.rate} />
                  </li>
                ))}
              </ul>
            ) : (
              <Field label="KES per unit (m³)" htmlFor="ut-rate">
                <Input
                  id="ut-rate"
                  inputMode="decimal"
                  value={flatRate}
                  onChange={(e) => setFlatRate(e.target.value)}
                />
              </Field>
            )}
            <Switch
              label="Use tiered pricing instead"
              checked={tiered}
              onChange={(e) => setTiered(e.target.checked)}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="m-0 text-[15px] font-bold">Electricity and shared meter</h3>
            <p className="m-0 text-sm">
              Sub-meters per unit: <Money minor={kes(28.5)} /> / kWh
            </p>
            <Field label="Shared meter (common-area bill) apportioned by" htmlFor="ut-split">
              <Select
                id="ut-split"
                value={splitBy}
                onChange={(e) => setSplitBy(e.target.value as 'occupants' | 'equal')}
              >
                <option value="occupants">By occupants</option>
                <option value="equal">Equal split per unit</option>
              </Select>
            </Field>
            <p className="m-0 rounded-control bg-soft px-3 py-2 text-sm">
              Nov borehole pump bill <Money minor={poolBill} /> across {occupants}{' '}
              {splitBy === 'occupants' ? 'occupants' : 'units'} = <Money minor={each} /> each.
            </p>
          </div>
        </div>
      </Card>

      <section aria-label="Readings summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Readings in"
          value={`${recorded.length} / ${rows.length}`}
          sub={`${rows.length - recorded.length} units not yet read`}
        />
        <Stat label="Total consumption" value={`${totalUsed} m³`} sub="Recorded readings" />
        <Stat
          label="Billed this month"
          value={<Money minor={recorded.reduce((s, r) => s + amountOf(r.used ?? 0), 0)} />}
          sub="Nothing is invoiced until you approve"
        />
        <Stat
          label="Need review"
          value={unresolved.length}
          sub={`${flagged.length} flagged, ${sentBack} sent back`}
        />
      </section>

      <Card>
        <CardHeader title={`Water readings review · ${property?.name ?? ''} · November`} />
        <div className="mb-3 max-w-xs">
          <Field label="Property" htmlFor="ut-prop">
            <Select id="ut-prop" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {unresolved.length > 0 ? (
          <p
            role="status"
            className="m-0 mb-3 rounded-control bg-warn-soft px-3 py-2 text-sm text-warn"
          >
            {unresolved.length} readings need review before you approve. They are far above the
            unit&apos;s 3-month average. Check the meter photo, then accept or send back to the
            caretaker.
          </p>
        ) : null}
        <Table minWidth={820}>
          <THead>
            <TR>
              <TH>Unit</TH>
              <TH align="right">Previous</TH>
              <TH align="right">Current</TH>
              <TH align="right">Used</TH>
              <TH align="right">Amount</TH>
              <TH>Photo</TH>
              <TH>Read by</TH>
              <TH>Check</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => {
              const review = reviews[r.id];
              return (
                <TR key={r.id} className={cn(r.flagged && !review && 'bg-warn-soft/40')}>
                  <TD className="font-semibold">{r.unitCode}</TD>
                  <TD align="right" className="font-mono">
                    {r.previous}
                  </TD>
                  <TD align="right" className="font-mono">
                    {r.current ?? '-'}
                  </TD>
                  <TD align="right" className="font-mono">
                    {r.used === null ? '-' : `${r.used} m³`}
                  </TD>
                  <TD align="right">
                    {r.used === null ? '-' : <Money minor={amountOf(r.used)} />}
                  </TD>
                  <TD>
                    {r.current === null ? (
                      '-'
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPhoto(r.unitCode)}
                        aria-label={`View meter photo for ${r.unitCode}`}
                      >
                        View photo
                      </Button>
                    )}
                  </TD>
                  <TD>{r.readBy}</TD>
                  <TD>
                    {r.current === null ? (
                      <Badge tone="neutral">Not read</Badge>
                    ) : r.flagged ? (
                      review ? (
                        <Badge tone={review === 'accepted' ? 'ok' : 'neutral'}>
                          {review === 'accepted' ? 'Accepted' : 'Sent back'}
                        </Badge>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <Badge tone="warn">Unusual: 3× average ({r.avg} m³)</Badge>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setReviews((v) => ({ ...v, [r.id]: 'accepted' }))}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReviews((v) => ({ ...v, [r.id]: 'sent_back' }));
                                toast(`${r.unitCode} sent back to the caretaker.`, 'info');
                              }}
                            >
                              Send back
                            </Button>
                          </div>
                        </div>
                      )
                    ) : (
                      <Badge tone="ok">OK</Badge>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <p className="m-0 mt-3 text-xs text-muted">
          Approved readings post as water charges on November invoices. Corrections later are
          reversals, never deletions, and are audited.
        </p>
      </Card>

      <Dialog
        open={photo !== null}
        onClose={() => setPhoto(null)}
        title={`Meter photo · ${photo ?? ''}`}
        footer={<Button onClick={() => setPhoto(null)}>Close</Button>}
      >
        <div
          role="img"
          aria-label="Meter photo placeholder"
          className="flex h-48 items-center justify-center rounded-control bg-soft text-sm text-muted"
        >
          Meter photo placeholder
        </div>
      </Dialog>

      <Dialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        title="Bulk upload readings (CSV)"
        description="Columns: unit, current_reading, date. Rows are checked against previous readings before anything is saved."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCsvOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!csvName}
              onClick={() => {
                setCsvOpen(false);
                toast(`${csvName} checked: no rows saved until you approve (demo).`, 'ok');
                setCsvName('');
              }}
            >
              Check file
            </Button>
          </>
        }
      >
        <Button variant="secondary" onClick={() => toast('Template downloaded (demo).')}>
          Download template
        </Button>
        <Field label="Choose CSV file" htmlFor="ut-csv">
          <input
            id="ut-csv"
            type="file"
            accept=".csv,text/csv"
            className="min-h-11 text-sm"
            onChange={(e) => setCsvName(e.target.files?.[0]?.name ?? '')}
          />
        </Field>
      </Dialog>
    </div>
  );
}
