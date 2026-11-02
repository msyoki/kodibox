'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Field, Select, Switch, Textarea, useToast } from '@/components/ui';
import { Eyebrow } from '@/components/tenant-app/bits';
import { useTenantLocal } from '@/components/tenant-app/local-state';
import { cn } from '@/lib/cn';
import { DEMO_TENANT_ID } from '@/demo';
import { formatDate } from '@/demo/format';
import { useDemoStore } from '@/demo/store';
import {
  PROPERTY_LABEL,
  REQUEST_KINDS,
  TICKET_STATUS_LABEL,
  TICKET_TONE,
  listMyTickets,
  type RequestKind,
} from '@/demo/tenant-app';

const URGENCY = ['Low', 'Normal', 'High', 'Urgent'] as const;
const ACCESS_TIMES = ['Morning', 'Afternoon', 'Evening', 'Anytime'] as const;
const COMPLAINT_ABOUT = [
  'Neighbour or noise',
  'Security',
  'Cleanliness or garbage',
  'Caretaker or staff conduct',
  'Landlord or management',
  'Other',
];

function EmergencyBanner() {
  return (
    <div
      role="note"
      className="flex items-center gap-2.5 rounded-card border border-danger bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
        className="flex-none"
      >
        <path d="M12 3l10 18H2L12 3z" />
        <path d="M12 10v5M12 18v.5" />
      </svg>
      <span>Fire, gas leak or break-in? Call 999 or 112 first.</span>
    </div>
  );
}

function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={cn(
              'min-h-11 rounded-control border px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              value === o
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-border-strong bg-surface text-muted',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewTicketForm({ onDone }: { onDone: () => void }) {
  const { addTicket } = useTenantLocal();
  const { toast } = useToast();
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [subject, setSubject] = useState(COMPLAINT_ABOUT[0] as string);
  const [priv, setPriv] = useState(true);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState(0);
  const [urgency, setUrgency] = useState<string>('Normal');
  const [access, setAccess] = useState<string>('Morning');
  const [error, setError] = useState<string>();

  const kindLabel = REQUEST_KINDS.find((k) => k.id === kind)?.label;

  function submit() {
    if (!kind) return;
    if (body.trim().length < 5) {
      setError('Tell us a little more so we can help (at least a few words).');
      return;
    }
    const title =
      kind === 'complaint'
        ? `Complaint: ${subject}`
        : `${kindLabel}: ${body.trim().slice(0, 40)}${body.trim().length > 40 ? '…' : ''}`;
    addTicket({ title, kind, body: body.trim() });
    toast('Ticket sent. Your manager has been notified.', 'ok');
    onDone();
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-surface px-2 py-2">
        <button
          type="button"
          aria-label="Back"
          onClick={() => (kind ? setKind(null) : onDone())}
          className="flex size-11 items-center justify-center rounded-control hover:bg-divider focus-visible:outline-2 focus-visible:outline-brand"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="m-0 text-lg font-extrabold">
          {kind ? `New ${kindLabel?.toLowerCase()}` : 'New ticket'}
        </h1>
      </header>
      <div className="flex flex-col gap-4 p-4">
        <EmergencyBanner />
        {!kind ? (
          <div role="group" aria-labelledby="ty" className="flex flex-col gap-2">
            <span id="ty" className="text-sm font-semibold">
              What do you need help with?
            </span>
            <div className="grid grid-cols-2 gap-2">
              {REQUEST_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className="flex min-h-24 flex-col items-start gap-1 rounded-card border border-border bg-surface p-3 text-left hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <strong className="text-[15px]">{k.label}</strong>
                  <span className="text-xs text-muted">{k.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {kind === 'complaint' ? (
              <>
                <Field label="Complaint about" htmlFor="subj">
                  <Select id="subj" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    {COMPLAINT_ABOUT.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
                <div className="rounded-card border border-border bg-surface px-3">
                  <Switch
                    label="Keep my name private from the other party"
                    checked={priv}
                    onChange={(e) => setPriv(e.target.checked)}
                  />
                  <p className="m-0 pb-3 text-xs text-muted">Management still sees who you are.</p>
                </div>
              </>
            ) : null}
            <Field label="Describe what happened" htmlFor="desc" error={error}>
              <Textarea
                id="desc"
                rows={3}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setError(undefined);
                }}
                placeholder={kind === 'repair' ? 'What is broken and where?' : 'Write your message'}
              />
            </Field>
            <div role="group" aria-labelledby="ph" className="flex flex-col gap-1.5">
              <span id="ph" className="text-sm font-semibold">
                Photos <span className="font-normal text-muted">(optional)</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: photos }, (_, i) => (
                  <div
                    key={i}
                    className="flex size-16 items-center justify-center rounded-control bg-soft text-xs text-muted"
                  >
                    Photo {i + 1}
                  </div>
                ))}
                {photos < 4 ? (
                  <button
                    type="button"
                    aria-label="Add photo"
                    onClick={() => setPhotos((p) => p + 1)}
                    className="flex size-16 items-center justify-center rounded-control border border-dashed border-brand text-2xl text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    +
                  </button>
                ) : null}
              </div>
              <span className="text-xs text-muted">
                Placeholder only: no photo is uploaded in the demo.
              </span>
            </div>
            <Chips label="Urgency" options={URGENCY} value={urgency} onChange={setUrgency} />
            {kind === 'repair' ? (
              <Chips
                label="Preferred access time"
                options={ACCESS_TIMES}
                value={access}
                onChange={setAccess}
              />
            ) : null}
            <Button size="lg" onClick={submit}>
              Send ticket
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TenantTicketsPage() {
  const { data } = useDemoStore();
  const { localTickets } = useTenantLocal();
  const [creating, setCreating] = useState(false);
  const tickets = listMyTickets(DEMO_TENANT_ID, data, localTickets);

  if (creating) return <NewTicketForm onDone={() => setCreating(false)} />;

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>{PROPERTY_LABEL}</Eyebrow>
          <h1 className="m-0 text-2xl font-extrabold">Help &amp; tickets</h1>
        </div>
        <Button onClick={() => setCreating(true)}>New ticket</Button>
      </header>
      <EmergencyBanner />
      <section aria-label="My tickets" className="flex flex-col gap-2">
        {tickets.length === 0 ? <p className="text-sm text-muted">No tickets yet.</p> : null}
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/m/tenant/tickets/${t.id}`}
            className="flex flex-col gap-1 rounded-card border border-border bg-surface p-3 text-text no-underline hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span className="flex items-start justify-between gap-2">
              <strong className="text-sm">{t.title}</strong>
              <Badge tone={TICKET_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
            </span>
            <span className="text-xs text-muted">
              {t.number} · {t.kindLabel} · opened {formatDate(t.createdAt)}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
