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
  LinkButton,
  MaskedText,
  Money,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { listLandlordSummaries } from '@/demo/agency';
import { formatDate } from '@/demo/format';
import { useDemoStore } from '@/demo/store';

export function LandlordsView() {
  const { data, actions } = useDemoStore();
  const { toast } = useToast();
  const summaries = listLandlordSummaries(data);
  const [selectedId, setSelectedId] = useState(summaries[0]?.landlord.id ?? '');
  const [payOpen, setPayOpen] = useState(false);
  const [ref, setRef] = useState('');
  const [refError, setRefError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const sel = summaries.find((s) => s.landlord.id === selectedId) ?? summaries[0];
  const rem = sel?.current;
  // Statement is computed from its parts, never trusted from a stored total.
  const net = rem ? rem.gross - rem.commission - rem.expenses : 0;

  function confirmRemit() {
    if (!rem || !sel) return;
    if (ref.trim().length < 6) {
      setRefError('Enter the bank or M-Pesa reference (at least 6 characters).');
      return;
    }
    actions.markRemitted(rem.id);
    setPayOpen(false);
    toast(`Remittance to ${sel.landlord.name} marked paid, ref ${ref.trim()}`, 'ok');
    setRef('');
    setRefError('');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Landlords"
        eyebrow="Agency clients. Kodibox never holds the money: you remit from your own account."
      />

      <Card aria-labelledby="clients">
        <CardHeader title="Landlord clients" id="clients" />
        <Table minWidth={680}>
          <THead>
            <TR>
              <TH>Landlord</TH>
              <TH>Properties</TH>
              <TH>Commission rule</TH>
              <TH align="right">Remittance due</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {summaries.map((s) => {
              const active = s.landlord.id === sel?.landlord.id;
              return (
                <TR key={s.landlord.id} className={active ? 'bg-brand-tint' : undefined}>
                  <TD>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedId(s.landlord.id)}
                      className="min-h-11 text-left font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {s.landlord.name}
                    </button>
                    <div className="text-xs text-muted">
                      <MaskedText kind="phone" value={s.landlord.phone} /> ·{' '}
                      {s.landlord.payoutMethod === 'bank' ? 'Bank payout' : 'M-Pesa payout'}
                    </div>
                  </TD>
                  <TD>{s.properties.map((p) => p.name).join(', ')}</TD>
                  <TD>{s.landlord.commissionPct}% of collected rent</TD>
                  <TD align="right">{s.current ? <Money minor={s.current.net} /> : '-'}</TD>
                  <TD>
                    {s.current?.status === 'remitted' ? (
                      <Badge tone="ok">Remitted</Badge>
                    ) : (
                      <Badge tone="warn">Due 5 Dec</Badge>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      {sel && rem ? (
        <Card aria-labelledby="stmt" className="flex flex-col gap-4">
          <CardHeader
            title={`Remittance statement: ${sel.landlord.name}, November 2026`}
            id="stmt"
            action={
              <Button variant="secondary" size="sm" onClick={() => setInviteOpen(true)}>
                Invite to portal
              </Button>
            }
          />
          <dl className="m-0 grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
            <dt>Rent collected</dt>
            <dd className="m-0 text-right">
              <Money minor={rem.gross} />
            </dd>
            <dt>Less commission ({sel.landlord.commissionPct}%)</dt>
            <dd className="m-0 text-right">
              <Money minor={-rem.commission} />
            </dd>
            <dt>Less approved expenses</dt>
            <dd className="m-0 text-right">
              <Money minor={-rem.expenses} />
            </dd>
            <dt className="border-t border-border pt-2 font-bold">To remit</dt>
            <dd className="m-0 border-t border-border pt-2 text-right text-lg font-bold">
              <Money minor={net} />
            </dd>
          </dl>
          <p className="m-0 text-xs text-muted">
            Collections − commission − expenses = remittance. Tenants paid straight to the property
            paybill or account; this statement only records what you pass on.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {rem.status === 'due' ? (
              <Button onClick={() => setPayOpen(true)}>Mark remitted</Button>
            ) : (
              <Badge tone="ok">Remitted {rem.remittedAt ? formatDate(rem.remittedAt) : ''}</Badge>
            )}
            <Button
              variant="secondary"
              onClick={() =>
                toast(`Statement for ${sel.landlord.name} downloaded. Logged for audit.`, 'ok')
              }
            >
              Download statement
            </Button>
          </div>

          <div>
            <h3 className="m-0 mb-2 text-[15px] font-bold">History</h3>
            <Table minWidth={420}>
              <THead>
                <TR>
                  <TH>Month</TH>
                  <TH align="right">Paid to landlord</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {sel.history.map((h) => (
                  <TR key={h.id}>
                    <TD>{h.period === '2026-11' ? 'November 2026' : 'October 2026'}</TD>
                    <TD align="right">
                      <Money minor={h.gross - h.commission - h.expenses} />
                    </TD>
                    <TD>
                      <Badge tone={h.status === 'remitted' ? 'ok' : 'warn'}>
                        {h.status === 'remitted' ? 'Remitted' : 'Due'}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      ) : null}

      <Dialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Mark remittance as paid"
        description={`Record that you paid ${sel?.landlord.name ?? ''} from your own account. This is audited and cannot be deleted, only reversed.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRemit}>Confirm paid</Button>
          </>
        }
      >
        <p className="m-0 text-sm">
          Amount: <Money minor={net} />
        </p>
        <Field label="Bank or M-Pesa reference" htmlFor="rem-ref" error={refError}>
          <Input
            id="rem-ref"
            value={ref}
            onChange={(e) => {
              setRef(e.target.value);
              setRefError('');
            }}
            placeholder="e.g. EQ-55102977"
          />
        </Field>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite to portal"
        description={`${sel?.landlord.name ?? ''} gets a read-only view of their properties, collections and statements. They cannot change anything.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <LinkButton href="/portal" variant="secondary">
              Preview portal
            </LinkButton>
            <Button
              onClick={() => {
                setInviteOpen(false);
                toast(`Portal invite sent to ${sel?.landlord.name ?? 'landlord'}`, 'ok');
              }}
            >
              Send invite
            </Button>
          </>
        }
      >
        <p className="m-0 text-sm text-muted">
          The invite goes by SMS to <MaskedText kind="phone" value={sel?.landlord.phone ?? ''} />.
        </p>
      </Dialog>
    </div>
  );
}
