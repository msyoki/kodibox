'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  LinkButton,
  MaskedText,
  Money,
  Table,
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { formatDate } from '@/demo/format';
import { getInstruction, reminderSms } from '@/demo/recon';
import { useDemoStore } from '@/demo/store';
import type { TenantDetail } from '@/demo';
import type { LedgerRow, RevealedContact } from '@/demo/properties-tenants';
import { kes } from '@/lib/money';

export function TenantProfile({
  detail,
  ledger,
  revealed,
}: {
  detail: TenantDetail;
  ledger: LedgerRow[];
  revealed: RevealedContact;
}) {
  const { toast } = useToast();
  const { tenant, unit, property, lease } = detail;
  const [show, setShow] = useState(false);
  const { data, actions } = useDemoStore();
  const [reminderOpen, setReminderOpen] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(!tenant.smsOptOut);

  const instruction = getInstruction(data, tenant.propertyId);
  const smsBody = reminderSms(
    instruction,
    unit.code,
    tenant.name,
    `KES ${Math.round(Math.max(tenant.balance, 0) / 100).toLocaleString('en-KE')}`,
  );

  function sendReminder() {
    setReminderOpen(false);
    if (tenant.smsOptOut) {
      toast(`${tenant.name} has opted out of SMS. No reminder was sent.`, 'info');
      return;
    }
    actions.logAudit(
      'reminder.sent',
      unit.code,
      `Payment reminder SMS sent to ${tenant.name} (${unit.code})`,
    );
    toast(`Payment reminder sent to ${tenant.name}.`, 'ok');
  }

  const overview = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <LeaseTermsCard detail={detail} />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Recurring charges" />
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            <li className="flex justify-between gap-3">
              <span>
                <strong>Rent</strong>
                <br />
                <span className="text-muted">Monthly</span>
              </span>
              <Money minor={lease.rent} />
            </li>
            <li className="flex justify-between gap-3">
              <span>
                <strong>Service charge</strong>
                <br />
                <span className="text-muted">Fixed monthly, includes garbage</span>
              </span>
              <Money minor={unit.serviceCharge} />
            </li>
            <li className="flex justify-between gap-3">
              <span>
                <strong>Water</strong>
                <br />
                <span className="text-muted">Metered · KES 120 per unit</span>
              </span>
              <span className="text-muted">Per reading</span>
            </li>
          </ul>
        </Card>
        <Card>
          <CardHeader title="Deposit held" />
          <p className="m-0 text-2xl font-extrabold">
            <Money minor={lease.deposit} />
          </p>
          <p className="mt-1 mb-0 text-sm text-muted">
            Held by landlord, tracked here. Refund via move-out.
          </p>
        </Card>
        <Card>
          <CardHeader title="Consents" />
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span>
                Rent reminders by SMS
                <br />
                <span className="text-muted">
                  Recorded {formatDate(lease.startDate)} at lease signing
                </span>
              </span>
              <Badge tone={smsOptIn ? 'ok' : 'neutral'}>{smsOptIn ? 'Yes' : 'Opted out'}</Badge>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>
                Marketing messages
                <br />
                <span className="text-muted">
                  Recorded {formatDate(lease.startDate)} at lease signing
                </span>
              </span>
              <Badge tone="neutral">No</Badge>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>
                Share contact with caretaker
                <br />
                <span className="text-muted">
                  Recorded {formatDate(lease.startDate)} at lease signing
                </span>
              </span>
              <Badge tone="ok">Yes</Badge>
            </li>
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              setSmsOptIn((v) => !v);
              toast(
                smsOptIn
                  ? 'Recorded SMS opt-out. No further SMS will be sent.'
                  : 'SMS consent recorded.',
                'info',
              );
            }}
          >
            {smsOptIn ? 'Record SMS opt-out' : 'Record SMS opt-in'}
          </Button>
          <p className="mt-2 mb-0 text-xs text-muted">
            Every SMS carries an opt-out. Tenant can export their data or request corrections from
            the app.
          </p>
        </Card>
      </div>
    </div>
  );

  const statement = (
    <Card>
      <CardHeader
        title="Statement · Oct to Nov 2026"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast(`Statement sent to ${tenant.name} by SMS link (demo).`, 'ok')}
          >
            Send statement
          </Button>
        }
      />
      <p className="mt-0 text-sm text-muted">
        Ledger entries are never deleted. Corrections post as reversals.
      </p>
      <Table minWidth={680}>
        <THead>
          <TR>
            <TH>Date</TH>
            <TH>Description</TH>
            <TH align="right">Debit</TH>
            <TH align="right">Credit</TH>
            <TH align="right">Balance</TH>
          </TR>
        </THead>
        <TBody>
          {ledger.map((r, i) => (
            <TR key={`${r.ref}-${i}`}>
              <TD className="whitespace-nowrap">{r.date}</TD>
              <TD>
                {r.desc}
                <br />
                <span className="font-mono text-xs text-muted">{r.ref}</span>
              </TD>
              <TD align="right">{r.debit ? <Money minor={r.debit} prefix={false} /> : ''}</TD>
              <TD align="right" className="text-ok">
                {r.credit ? <Money minor={r.credit} prefix={false} /> : ''}
              </TD>
              <TD align="right" className="font-semibold">
                <Money minor={r.balance} prefix={false} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', content: overview },
    { id: 'statement', label: 'Statement', content: statement },
    {
      id: 'lease',
      label: 'Lease',
      content: (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LeaseTermsCard detail={detail} />
          <Card>
            <CardHeader title="Penalty rule" />
            <p className="m-0 text-sm">
              5% of the unpaid amount after a 3 day grace period, capped at KES 1,000. Penalties
              post to the ledger as separate entries and can be reversed, never deleted.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href="/move-outs" variant="secondary">
                Issue notice
              </LinkButton>
              <LinkButton href="/move-outs" variant="danger">
                End lease
              </LinkButton>
            </div>
            <p className="mt-3 mb-0 text-xs text-muted">
              Kodibox has no eviction or lockout tools. Notices follow the agreed notice period.
            </p>
          </Card>
        </div>
      ),
    },
    {
      id: 'documents',
      label: 'Documents',
      content: (
        <Card>
          <CardHeader title="Documents" />
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {[
              `Lease agreement (signed ${formatDate(lease.startDate)})`,
              'Deposit receipt',
              'Welcome notice and privacy notice',
            ].map((d) => (
              <li
                key={d}
                className="flex items-center justify-between gap-3 border-t border-divider pt-2 first:border-t-0 first:pt-0"
              >
                <span>{d}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast(`${d} downloaded (demo).`, 'info')}
                >
                  Download
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ),
    },
    {
      id: 'messages',
      label: 'Messages',
      content: (
        <Card>
          <CardHeader
            title="Messages"
            action={
              <Link href="/messages" className="text-link">
                Open messages
              </Link>
            }
          />
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
            <li>
              <strong>SMS · 1 Nov 2026</strong>
              <br />
              November invoice issued. Pay to your landlord&apos;s paybill, account {unit.code}.
              Reply STOP to opt out.
            </li>
            <li>
              <strong>SMS · 28 Oct 2026</strong>
              <br />
              Rent reminder: balance due on the 5th. Reply STOP to opt out.
            </li>
          </ul>
        </Card>
      ),
    },
    {
      id: 'activity',
      label: 'Activity',
      content: (
        <Card>
          <CardHeader title="Activity" />
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {detail.payments.slice(0, 4).map((p) => (
              <li key={p.id}>
                {formatDate(p.receivedAt)}: payment <span className="font-mono">{p.reference}</span>{' '}
                of <Money minor={p.amount} />
              </li>
            ))}
            {detail.invoices.slice(0, 3).map((i) => (
              <li key={i.id}>
                {formatDate(i.issueDate)}: invoice <span className="font-mono">{i.number}</span>{' '}
                issued
              </li>
            ))}
            {show ? <li>Today: contact details revealed by you (logged).</li> : null}
          </ul>
        </Card>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${property.name} · Unit ${unit.code} · ${unit.type}`}
        title={tenant.name}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast(`Statement sent to ${tenant.name} (demo).`, 'ok')}
            >
              Send statement
            </Button>
            <LinkButton href="/move-outs" variant="secondary">
              Issue notice
            </LinkButton>
            <Button onClick={() => setReminderOpen(true)}>Send payment reminder</Button>
            <LinkButton href="/move-outs" variant="danger">
              End lease
            </LinkButton>
          </>
        }
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={tenant.name} size="lg" />
          <div className="flex-1">
            <p className="m-0 text-sm text-muted">Balance</p>
            <p className="m-0 text-2xl font-extrabold">
              <Money minor={tenant.balance} />
            </p>
          </div>
          <Badge tone={lease.status === 'active' ? 'ok' : 'warn'}>
            Lease {lease.status.replace('_', ' ')}
          </Badge>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div>
            <dt className="text-muted">Phone</dt>
            <dd className="m-0 font-semibold">
              {show ? (
                <span className="font-mono">{revealed.phone}</span>
              ) : (
                <MaskedText kind="phone" value={tenant.phone} />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">National ID</dt>
            <dd className="m-0 font-semibold">
              {show ? (
                <span className="font-mono">{revealed.nationalId}</span>
              ) : (
                <MaskedText kind="id" value={tenant.nationalId} />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">KRA PIN</dt>
            <dd className="m-0 font-mono font-semibold">
              {show
                ? revealed.kraPin
                : `${revealed.kraPin.slice(0, 1)}•••••••${revealed.kraPin.slice(-3)}`}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="m-0 font-semibold">{tenant.email ?? 'Not provided'}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            aria-pressed={show}
            onClick={() => {
              setShow((s) => !s);
              if (!show) toast('Reveal logged to the audit trail.', 'info');
            }}
          >
            {show ? 'Hide details' : 'Reveal phone, ID and PIN'}
          </Button>
          <p role="status" className="m-0 text-sm text-muted">
            {show
              ? 'This reveal was logged: Wanjiru Mwangi, 2 Nov 2026 10:14, reason required.'
              : 'Each reveal is recorded in the audit log with your name and time.'}
          </p>
        </div>
      </Card>

      <Tabs tabs={tabs} />

      <Dialog
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        title="Send payment reminder"
        description="Sends an SMS with how to pay and the tenant's account reference. The money goes to your own account; Kodibox never holds it."
        footer={
          <>
            <Button variant="ghost" onClick={() => setReminderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendReminder}>Send reminder</Button>
          </>
        }
      >
        <p className="m-0 rounded-card bg-divider p-3.5 text-sm">{smsBody}</p>
        <p className="m-0 text-sm text-muted">
          To: <MaskedText kind="phone" value={tenant.phone} />
          {tenant.smsOptOut ? ' (opted out of SMS)' : ''}
        </p>
      </Dialog>
    </div>
  );
}

function LeaseTermsCard({ detail }: { detail: TenantDetail }) {
  const { lease, unit } = detail;
  const rows: [string, React.ReactNode][] = [
    ['Start date', formatDate(lease.startDate)],
    ['End date', formatDate(lease.endDate)],
    ['Monthly rent', <Money key="r" minor={lease.rent || kes(0)} />],
    ['Due day', '5th of month'],
    ['Grace period', '3 days'],
    ['Late penalty', '5% of unpaid, cap KES 1,000'],
    [
      'M-Pesa account no.',
      <span key="a" className="font-mono">
        {unit.code}
      </span>,
    ],
    ['Notice period', '30 days'],
  ];
  return (
    <Card>
      <CardHeader title="Lease terms" />
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted">{k}</dt>
            <dd className="m-0 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
