'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, EmptyState, LinkButton, Textarea, useToast } from '@/components/ui';
import { BackHeader } from '@/components/tenant-app/bits';
import { useTenantLocal } from '@/components/tenant-app/local-state';
import { cn } from '@/lib/cn';
import { DEMO_TENANT_ID } from '@/demo';
import { formatDate } from '@/demo/format';
import { useDemoStore } from '@/demo/store';
import {
  TICKET_STATUS_LABEL,
  TICKET_TONE,
  listMyTickets,
  ticketTimeline,
  whenLabel,
} from '@/demo/tenant-app';
import type { TicketStatus } from '@/demo/types';

export default function TenantTicketPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, actions } = useDemoStore();
  const { localTickets, setLocalStatus, addLocalMessage, feedback, setFeedback } = useTenantLocal();
  const { toast } = useToast();
  const [draft, setDraft] = useState('');

  const ticket = listMyTickets(DEMO_TENANT_ID, data, localTickets).find((t) => t.id === id);
  if (!ticket) {
    return (
      <div className="flex flex-col">
        <BackHeader href="/m/tenant/tickets" label="Back to tickets" title="Ticket" />
        <div className="p-4">
          <EmptyState
            title="Ticket not found"
            description="It may belong to another tenant."
            action={<LinkButton href="/m/tenant/tickets">My tickets</LinkButton>}
          />
        </div>
      </div>
    );
  }

  const fb = feedback[ticket.id] ?? { rating: 0, fixed: false };
  const resolved = ticket.status === 'resolved' || ticket.status === 'closed';
  const timeline = ticketTimeline(ticket.status, ticket.assignee);

  function setStatus(s: TicketStatus) {
    if (!ticket) return;
    if (ticket.local) setLocalStatus(ticket.id, s);
    else actions.updateTicketStatus(ticket.id, s);
  }

  function send() {
    const body = draft.trim();
    if (!body || !ticket) return;
    if (ticket.local) addLocalMessage(ticket.id, body);
    else actions.addTicketMessage(ticket.id, { author: 'Peter Otieno', role: 'tenant', body });
    setDraft('');
    toast('Message sent', 'ok');
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader href="/m/tenant/tickets" label="Back to Help and tickets" title={ticket.title} />
      <div className="flex flex-col gap-4 p-4">
        <p className="m-0 text-xs text-muted">
          {ticket.number} · {ticket.kindLabel} · opened {formatDate(ticket.createdAt)}
        </p>

        <section aria-labelledby="tl" className="rounded-card border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="tl" className="m-0 text-base font-extrabold">
              Progress
            </h2>
            <Badge tone={TICKET_TONE[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</Badge>
          </div>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {timeline.map((s) => (
              <li key={s.title} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 flex-none items-center justify-center rounded-full text-xs font-extrabold',
                    s.done ? 'bg-brand text-white' : 'border border-border-strong bg-soft',
                  )}
                >
                  {s.done ? '✓' : ''}
                </span>
                <span className={cn('text-sm', s.done ? 'font-bold' : 'text-muted')}>
                  {s.title}
                  <span className="sr-only">{s.done ? ' (done)' : ' (not yet)'}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="th" className="flex flex-col gap-2">
          <h2 id="th" className="m-0 text-base font-extrabold">
            Messages
          </h2>
          {ticket.messages.map((m) => {
            const mine = m.role === 'tenant';
            return (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col gap-1 rounded-card border px-3.5 py-2.5',
                  mine ? 'mr-8 border-divider bg-bg' : 'ml-8 border-brand-soft bg-brand-soft',
                )}
              >
                <div className="flex justify-between gap-2 text-xs text-muted">
                  <strong className="text-text">{mine ? 'You' : m.author}</strong>
                  <span>{whenLabel(m.at)}</span>
                </div>
                <p className="m-0 text-sm">{m.body}</p>
              </div>
            );
          })}
          <label className="mt-1 flex flex-col gap-1.5 text-sm font-semibold" htmlFor="msg">
            Add a message
          </label>
          <Textarea
            id="msg"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write to your manager"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              aria-label="Add photo"
              onClick={() => toast('Photo attached (placeholder)', 'info')}
            >
              Photo
            </Button>
            <Button className="flex-1" onClick={send} disabled={!draft.trim()}>
              Send
            </Button>
          </div>
        </section>

        {resolved ? (
          <section
            aria-labelledby="fx"
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
          >
            <h2 id="fx" className="m-0 text-base font-extrabold">
              Was this fixed?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  setFeedback(ticket.id, { fixed: true });
                  setStatus('closed');
                  toast('Thanks. Ticket closed.', 'ok');
                }}
              >
                Yes, fixed
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setFeedback(ticket.id, { fixed: false });
                  setStatus('in_progress');
                  if (!ticket.local)
                    actions.addTicketMessage(ticket.id, {
                      author: 'Peter Otieno',
                      role: 'tenant',
                      body: 'Reopened: the problem is not fixed.',
                    });
                  toast('Ticket reopened', 'warn');
                }}
              >
                Reopen
              </Button>
            </div>
            <div role="group" aria-labelledby="rt" className="flex flex-col gap-1">
              <span id="rt" className="text-sm font-semibold">
                Rate the resolution{' '}
                <span className="font-normal text-muted">
                  {fb.rating ? `· ${fb.rating} of 5` : '· tap a star'}
                </span>
              </span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                    aria-pressed={fb.rating === n}
                    onClick={() => {
                      setFeedback(ticket.id, { rating: n });
                      toast(`Rated ${n} of 5`, 'ok');
                    }}
                    className="flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      fill={n <= fb.rating ? '#F0B54A' : 'none'}
                      stroke={n <= fb.rating ? '#8A4B08' : '#5A635F'}
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!resolved ? (
          <button
            type="button"
            onClick={() => {
              setStatus('resolved');
              toast('Demo: manager marked this resolved', 'info');
            }}
            className="min-h-11 self-start text-xs text-muted underline"
          >
            Demo only: simulate the manager marking this resolved
          </button>
        ) : null}
      </div>
    </div>
  );
}
