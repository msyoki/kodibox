'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  Field,
  LinkButton,
  Money,
  Select,
  Textarea,
  useToast,
  type Tone,
} from '@/components/ui';
import { getTicket, listInvoices, type TicketStatus } from '@/demo';
import { formatWhen } from '@/demo/format';
import { ASSIGNEES, PRIORITY_LABEL, isStaffComplaint, ticketSla, ticketType } from '@/demo/ops';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';

type StepId = 'new' | 'assigned' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

const STEPS: { id: StepId; label: string; store: TicketStatus }[] = [
  { id: 'new', label: 'New', store: 'new' },
  { id: 'assigned', label: 'Acknowledged', store: 'assigned' },
  { id: 'in_progress', label: 'In progress', store: 'in_progress' },
  { id: 'waiting', label: 'Waiting on tenant', store: 'in_progress' },
  { id: 'resolved', label: 'Resolved', store: 'resolved' },
  { id: 'closed', label: 'Closed', store: 'closed' },
];

const PRIORITY_TONE: Record<string, Tone> = {
  urgent: 'danger',
  high: 'warn',
  normal: 'info',
  low: 'neutral',
};

export function TicketDetail({ ticketId, onClose }: { ticketId: string; onClose?: () => void }) {
  const { data, actions } = useDemoStore();
  const { toast } = useToast();
  const uid = useId();
  const detail = getTicket(ticketId, data);

  const [waiting, setWaiting] = useState(false);
  const [mode, setMode] = useState<'public' | 'internal'>('public');
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [linked, setLinked] = useState<string | null>(null);
  const [woCreated, setWoCreated] = useState(false);

  if (!detail) {
    return (
      <Card>
        <p className="m-0">Ticket not found.</p>
        <LinkButton href="/tickets" variant="secondary" className="mt-3">
          Back to tickets
        </LinkButton>
      </Card>
    );
  }
  const { ticket, messages } = detail;
  const type = ticketType(ticket);
  const sla = ticketSla(ticket);
  const staff = isStaffComplaint(ticket);
  const currentAssignee = assignee ?? ticket.assignee ?? 'Unassigned';
  const stepIndex =
    waiting && ticket.status === 'in_progress'
      ? 3
      : STEPS.findIndex((s) => s.store === ticket.status && s.id !== 'waiting');
  const invoices = listInvoices({ tenantId: ticket.tenantId, status: 'open' }, data);

  function setStep(id: StepId) {
    const step = STEPS.find((s) => s.id === id);
    if (!step) return;
    setWaiting(id === 'waiting');
    actions.updateTicketStatus(ticket.id, step.store);
    toast(`${ticket.number} moved to ${step.label}. Recorded in the audit log.`, 'ok');
  }

  function send() {
    const body = text.trim();
    if (!body) {
      toast('Write a message first.', 'warn');
      return;
    }
    actions.addTicketMessage(ticket.id, {
      author: 'Wanjiru Mwangi',
      role: 'manager',
      body,
      internal: mode === 'internal',
    });
    setText('');
    toast(
      mode === 'internal'
        ? 'Internal note added. The tenant cannot see it.'
        : 'Reply sent to the tenant.',
      'ok',
    );
  }

  function assign(value: string) {
    setAssignee(value);
    toast(`Assigned to ${value}.`, 'ok');
  }

  function escalate() {
    setEscalated(true);
    actions.addTicketMessage(ticket.id, {
      author: 'System',
      role: 'system',
      body: 'Escalated to the Owner by the manager.',
      internal: true,
    });
    toast('Escalated to the Owner.', 'warn');
  }

  function createWorkOrder() {
    setWoCreated(true);
    toast('Work order created. Open it in Expenses & repairs.', 'ok');
  }

  function linkInvoice() {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    setLinked(inv.number);
    setLinkOpen(false);
    toast(`Invoice ${inv.number} linked to ${ticket.number}.`, 'ok');
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold">{ticket.number}</span>
          <Badge tone="info">{type}</Badge>
          <Badge tone={PRIORITY_TONE[ticket.priority] ?? 'neutral'}>
            {PRIORITY_LABEL[ticket.priority]}
          </Badge>
          <Badge tone={sla.tone}>{sla.label}</Badge>
          {type === 'Complaint' ? (
            <Badge tone="neutral">
              {staff ? 'Complaint about staff' : 'Reporter identity hidden from the other party'}
            </Badge>
          ) : null}
          {onClose ? (
            <Button variant="ghost" size="sm" className="ml-auto xl:hidden" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
        <h2 className="m-0 mt-2 text-xl font-extrabold">{ticket.title}</h2>
        <p className="m-0 mt-1 text-sm text-muted">
          {ticket.tenantName} · {ticket.unitCode} · {ticket.propertyName} · opened{' '}
          {formatWhen(ticket.createdAt)} · {currentAssignee}
        </p>
        {staff ? (
          <p className="m-0 mt-3 rounded-control bg-warn-soft px-3 py-2 text-sm text-warn">
            Complaints about staff are routed to the Owner and hidden from the caretaker.
          </p>
        ) : null}
        {type === 'Complaint' && !staff ? (
          <p className="m-0 mt-3 rounded-control bg-soft px-3 py-2 text-sm">
            The other party only sees that a complaint was received, never who raised it.
          </p>
        ) : null}

        <ol aria-label="Ticket status" className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStep(s.id)}
                aria-current={i === stepIndex ? 'step' : undefined}
                className={cn(
                  'min-h-11 rounded-control border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  i === stepIndex
                    ? 'border-brand bg-brand text-white'
                    : i < stepIndex
                      ? 'border-brand bg-brand-tint text-brand-dark'
                      : 'border-border-strong bg-surface text-muted hover:bg-soft',
                )}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="m-0 mt-3 text-xs text-muted">
          Acknowledge within 24h (emergency 1h). Overdue tickets escalate to the Owner. The tenant
          can reopen after Resolved or Closed.
        </p>
      </Card>

      <Card>
        <CardHeader title="Conversation" />
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                'rounded-control border px-3 py-2.5',
                m.internal ? 'border-warning bg-warn-soft' : 'border-border bg-surface',
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <strong>{m.author}</strong>
                <span className="text-muted">{formatWhen(m.at)}</span>
                {m.internal ? (
                  <Badge tone="warn">Internal: tenant can&apos;t see this</Badge>
                ) : null}
              </div>
              <p className="m-0 mt-1 text-[15px]">{m.body}</p>
            </li>
          ))}
        </ul>

        <fieldset className="m-0 mt-4 border-0 p-0">
          <legend className="sr-only">Reply type</legend>
          <div className="flex gap-2">
            {(['public', 'internal'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'min-h-11 rounded-control border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  mode === m
                    ? m === 'internal'
                      ? 'border-warning bg-warn-soft text-warn'
                      : 'border-brand bg-brand text-white'
                    : 'border-border-strong bg-surface',
                )}
              >
                {m === 'public' ? 'Public reply' : 'Internal note'}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mt-3">
          <Field
            label={mode === 'public' ? 'Reply to tenant' : 'Internal note'}
            htmlFor={`${uid}-msg`}
            help={
              mode === 'public'
                ? 'The tenant sees this reply in the app and by SMS (unless opted out).'
                : "Internal note: the tenant can't see this."
            }
          >
            <Textarea id={`${uid}-msg`} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => toast('Photo attached (demo).')}>
            Attach photo
          </Button>
          <Button onClick={send}>{mode === 'public' ? 'Send reply' : 'Add internal note'}</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Actions" />
        <div className="flex flex-col gap-3">
          <Field label="Assign to" htmlFor={`${uid}-assign`}>
            <Select
              id={`${uid}-assign`}
              value={assignee ?? ''}
              onChange={(e) => assign(e.target.value)}
            >
              <option value="" disabled>
                {ticket.assignee ?? 'Choose caretaker or vendor'}
              </option>
              {ASSIGNEES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={escalate} disabled={escalated}>
              {escalated ? 'Escalated to Owner' : 'Escalate to owner'}
            </Button>
            {woCreated ? (
              <LinkButton href="/maintenance" variant="secondary">
                Open work order
              </LinkButton>
            ) : (
              <Button variant="secondary" onClick={createWorkOrder}>
                Create work order
              </Button>
            )}
            <Button variant="secondary" onClick={() => setLinkOpen(true)}>
              {linked ? `Linked: ${linked}` : 'Link invoice'}
            </Button>
          </div>
          <p className="m-0 text-xs text-muted">
            Every change is recorded in the audit log.{' '}
            <Link href="/tickets" className="font-semibold text-brand underline">
              All tickets
            </Link>
          </p>
        </div>
      </Card>

      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Link an invoice"
        description="For billing queries, attach the invoice the tenant is asking about."
        footer={
          <>
            <Button variant="ghost" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={linkInvoice} disabled={!invoiceId}>
              Link invoice
            </Button>
          </>
        }
      >
        {invoices.length === 0 ? (
          <p className="m-0 text-sm">This tenant has no open invoices.</p>
        ) : (
          <Field label="Open invoices" htmlFor={`${uid}-inv`}>
            <Select
              id={`${uid}-inv`}
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            >
              <option value="">Choose an invoice</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number} · {i.period}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {invoices.map((i) =>
          i.id === invoiceId ? (
            <p key={i.id} className="m-0 text-sm">
              Balance <Money minor={i.balance} />
            </p>
          ) : null,
        )}
      </Dialog>
    </div>
  );
}
