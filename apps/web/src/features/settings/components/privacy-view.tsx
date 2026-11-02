'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  Field,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Textarea,
  TR,
  useToast,
} from '@/components/ui';
import { DEMO_TODAY, getTenant, listDataRequests } from '@/demo';
import { formatDate } from '@/demo/format';
import { useDemoStore } from '@/demo/store';

const KIND_LABEL = { export: 'Data export', correction: 'Correction', erasure: 'Erasure' } as const;
const STATUS_LABEL = {
  received: 'Received',
  in_review: 'In review',
  completed: 'Completed',
} as const;

const RETENTION = [
  {
    data: 'Financial records (invoices, payments, ledger)',
    keep: '7 years',
    basis: 'Tax and accounting law',
  },
  {
    data: 'Tenant identity documents',
    keep: '12 months after move-out',
    basis: 'Tenancy administration',
  },
  { data: 'SMS and delivery logs', keep: '12 months', basis: 'Dispute handling' },
  { data: 'Audit log', keep: '7 years, append-only', basis: 'Accountability' },
];

const CONSENTS = [
  {
    name: 'Rent reminders by SMS',
    note: 'Service message. Reply STOP to opt out.',
    count: '142 of 142',
  },
  { name: 'Marketing and promotions', note: 'Opt-in only. Never assumed.', count: '38 of 142' },
  {
    name: 'Share records with landlord portal',
    note: 'Per management agreement.',
    count: '142 of 142',
  },
];

function daysLeft(due: string): number {
  return Math.round((Date.parse(due) - Date.parse(DEMO_TODAY)) / 86_400_000);
}

export function PrivacyView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const requests = listDataRequests(data);
  const [done, setDone] = useState<string[]>([]);
  const [breachOpen, setBreachOpen] = useState(false);
  const [severity, setSeverity] = useState('low');
  const [what, setWhat] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="dsr">
        <CardHeader title="Data subject requests" id="dsr" />
        <p className="mt-0 text-sm text-muted">
          Tenants can ask for a copy, correction or erasure of their data. Respond within the 30-day
          SLA.
        </p>
        <Table minWidth={620}>
          <THead>
            <TR>
              <TH>Tenant</TH>
              <TH>Request</TH>
              <TH>Received</TH>
              <TH>SLA</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {requests.map((r) => {
              const complete = r.status === 'completed' || done.includes(r.id);
              const left = daysLeft(r.dueAt);
              return (
                <TR key={r.id}>
                  <TD>{getTenant(r.tenantId, data)?.tenant.name ?? 'Tenant'}</TD>
                  <TD>{KIND_LABEL[r.kind]}</TD>
                  <TD>{formatDate(r.receivedAt)}</TD>
                  <TD>
                    {complete ? (
                      'Met'
                    ) : (
                      <Badge tone={left <= 7 ? 'danger' : left <= 14 ? 'warn' : 'ok'}>
                        {left} days left
                      </Badge>
                    )}
                  </TD>
                  <TD>
                    {complete ? (
                      <Badge tone="ok">Completed</Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setDone((d) => [...d, r.id]);
                          toast(`${KIND_LABEL[r.kind]} request completed and logged`, 'ok');
                        }}
                      >
                        {STATUS_LABEL[r.status]}: mark complete
                      </Button>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Card aria-labelledby="ret">
        <CardHeader title="Retention schedule" id="ret" />
        <Table minWidth={520}>
          <THead>
            <TR>
              <TH>Data</TH>
              <TH>Kept for</TH>
              <TH>Basis</TH>
            </TR>
          </THead>
          <TBody>
            {RETENTION.map((r) => (
              <TR key={r.data}>
                <TD>{r.data}</TD>
                <TD>{r.keep}</TD>
                <TD>{r.basis}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card aria-labelledby="cons">
          <CardHeader title="Consents" id="cons" />
          <ul className="m-0 list-none p-0">
            {CONSENTS.map((c) => (
              <li key={c.name} className="border-t border-divider py-2 first:border-t-0">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-mono text-sm">{c.count}</span>
                </div>
                <div className="text-xs text-muted">{c.note}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card aria-labelledby="dpa">
          <CardHeader title="Data processing agreement" id="dpa" />
          <p className="mt-0 text-sm">
            <Badge tone="ok">Signed</Badge> Kodibox acts as your data processor. Signed 12 Jan 2025.
            Registered with the ODPC.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => toast('DPA downloaded', 'ok')}>
              Download DPA
            </Button>
            <Button variant="danger" onClick={() => setBreachOpen(true)}>
              Report a breach
            </Button>
          </div>
        </Card>
      </div>

      <Dialog
        open={breachOpen}
        onClose={() => setBreachOpen(false)}
        title="Report a data breach"
        description="The ODPC must be told within 72 hours of becoming aware. Kodibox will help you prepare the notice."
        footer={
          <>
            <Button variant="ghost" onClick={() => setBreachOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={what.trim().length < 10}
              onClick={() => {
                setBreachOpen(false);
                setWhat('');
                toast(
                  'Breach report logged. Our privacy team will contact you within 24 hours.',
                  'warn',
                );
              }}
            >
              Submit report
            </Button>
          </>
        }
      >
        <Field label="Severity" htmlFor="br-sev">
          <Select id="br-sev" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="low">Low: no personal data exposed</option>
            <option value="medium">Medium: limited personal data</option>
            <option value="high">High: financial or ID data</option>
          </Select>
        </Field>
        <Field
          label="What happened"
          htmlFor="br-what"
          help="At least 10 characters. Do not paste personal data here."
        >
          <Textarea id="br-what" value={what} onChange={(e) => setWhat(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}
