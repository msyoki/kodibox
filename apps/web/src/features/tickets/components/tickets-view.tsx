'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Select,
  Stat,
  type Tone,
} from '@/components/ui';
import { listProperties, listTickets } from '@/demo';
import { formatWhen } from '@/demo/format';
import {
  ASSIGNEES,
  PRIORITY_LABEL,
  ticketSla,
  ticketStats,
  ticketType,
  type TicketType,
} from '@/demo/ops';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';
import { TicketDetail } from './ticket-detail';

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  assigned: 'Acknowledged',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};
const PRIORITY_TONE: Record<string, Tone> = {
  urgent: 'danger',
  high: 'warn',
  normal: 'info',
  low: 'neutral',
};
const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

export function TicketsView() {
  const { data } = useDemoStore();
  const stats = ticketStats(data);
  const properties = listProperties(data);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('open');
  const [property, setProperty] = useState('');
  const [urgency, setUrgency] = useState('');
  const [assignee, setAssignee] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const rows = listTickets(
    {
      q,
      propertyId: property || undefined,
      status: status === '' ? undefined : (status as 'open'),
    },
    data,
  )
    .filter((t) => !type || ticketType(t) === (type as TicketType))
    .filter((t) => !urgency || t.priority === urgency)
    .filter((t) => {
      if (!assignee) return true;
      if (assignee === 'none') return !t.assignee;
      return (t.assignee ?? '').includes(assignee.split(' ')[0] ?? '');
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Tickets" eyebrow="Complaints, repairs and billing queries from tenants" />

      <section aria-label="Ticket summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tickets" value={stats.open} sub="Most urgent first" />
        <Stat
          label="SLA breached"
          value={stats.breached}
          sub="Overdue tickets escalate to the Owner"
        />
        <Stat label="Avg resolve time" value={stats.avgResolve} sub="Resolved and closed tickets" />
        <Stat label="Satisfaction" value={stats.satisfaction} sub="Tenant rating after closing" />
      </section>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Search tickets" htmlFor="tk-q">
            <Input id="tk-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Field label="Type" htmlFor="tk-type">
            <Select id="tk-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              <option>Repair</option>
              <option>Complaint</option>
              <option>Billing query</option>
            </Select>
          </Field>
          <Field label="Status" htmlFor="tk-status">
            <Select id="tk-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="">All</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Property" htmlFor="tk-prop">
            <Select id="tk-prop" value={property} onChange={(e) => setProperty(e.target.value)}>
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Urgency" htmlFor="tk-urg">
            <Select id="tk-urg" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="">Any urgency</option>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee" htmlFor="tk-asg">
            <Select id="tk-asg" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Anyone</option>
              <option value="none">Unassigned</option>
              {ASSIGNEES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <div
        className={cn('grid gap-5', selected ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : '')}
      >
        <Card>
          <CardHeader
            title={status === 'open' ? 'Open tickets' : 'Tickets'}
            action={`${rows.length} shown`}
          />
          {rows.length === 0 ? (
            <EmptyState title="No tickets match" description="Clear a filter to see more." />
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {rows.map((t) => {
                const sla = ticketSla(t);
                return (
                  <li key={t.id} className="border-t border-divider first:border-t-0">
                    <Link
                      href={`/tickets/${t.id}`}
                      onClick={(e) => {
                        if (window.matchMedia('(min-width: 1280px)').matches) {
                          e.preventDefault();
                          setSelected(t.id);
                        }
                      }}
                      aria-current={selected === t.id ? 'true' : undefined}
                      className={cn(
                        'flex min-h-11 flex-col gap-1 rounded-control px-2 py-3 text-text no-underline hover:bg-soft focus-visible:outline-2 focus-visible:outline-brand',
                        selected === t.id && 'bg-brand-tint',
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold">{t.number}</span>
                        <Badge tone="info">{ticketType(t)}</Badge>
                        <Badge tone={PRIORITY_TONE[t.priority] ?? 'neutral'}>
                          {PRIORITY_LABEL[t.priority]}
                        </Badge>
                        <Badge tone={sla.tone}>{sla.label}</Badge>
                      </span>
                      <span className="text-[15px] font-semibold">{t.title}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                        <span>
                          {t.unitCode} · {t.tenantName}
                        </span>
                        <span>{t.assignee ?? 'Unassigned'}</span>
                        <span>{formatWhen(t.updatedAt)}</span>
                        <Badge tone={t.status === 'new' ? 'warn' : 'neutral'}>
                          {STATUS_LABEL[t.status]}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        {selected ? (
          <div className="hidden xl:block">
            <TicketDetail key={selected} ticketId={selected} onClose={() => setSelected(null)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
