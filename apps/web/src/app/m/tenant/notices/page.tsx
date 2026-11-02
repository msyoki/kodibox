'use client';

import { useState } from 'react';
import { Badge, Button, Field, Input, useToast } from '@/components/ui';
import { BackHeader } from '@/components/tenant-app/bits';
import { useTenantLocal } from '@/components/tenant-app/local-state';
import { formatDate } from '@/demo/format';
import {
  MIN_NOTICE_DAYS,
  TENANT_DOCS,
  TENANT_NOTICES,
  earliestVacateDate,
} from '@/demo/tenant-app';

export default function TenantNoticesPage() {
  const { toast } = useToast();
  const { vacateDate, setVacateDate } = useTenantLocal();
  const min = earliestVacateDate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(min);
  const [error, setError] = useState<string>();

  function send() {
    if (!date || date < min) {
      setError(
        `Choose ${formatDate(min)} or later: your lease needs ${MIN_NOTICE_DAYS} days notice.`,
      );
      return;
    }
    setVacateDate(date);
    setOpen(false);
    setError(undefined);
    toast('Notice sent to your landlord', 'ok');
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader href="/m/tenant" label="Back to home" title="Notices and documents" />
      <div className="flex flex-col gap-5 p-4">
        <section aria-labelledby="nt" className="flex flex-col gap-2">
          <h2 id="nt" className="m-0 text-base font-extrabold">
            From your landlord
          </h2>
          {TENANT_NOTICES.map((n) => (
            <article
              key={n.id}
              className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <strong className="text-sm">{n.title}</strong>
                <Badge tone={n.tag === 'Action' ? 'warn' : 'info'}>{n.tag}</Badge>
              </div>
              <p className="m-0 text-sm">{n.body}</p>
              <p className="m-0 text-xs text-muted">{n.meta}</p>
            </article>
          ))}
        </section>

        <section
          aria-labelledby="vc"
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
        >
          <h2 id="vc" className="m-0 text-base font-extrabold">
            Moving out?
          </h2>
          <p className="m-0 text-sm text-muted">
            Your lease needs at least <strong className="text-text">{MIN_NOTICE_DAYS} days</strong>{' '}
            written notice. Giving notice is not a final commitment until your landlord confirms the
            date.
          </p>
          {vacateDate ? (
            <div
              role="status"
              className="rounded-control bg-ok-soft p-3 text-sm font-semibold text-ok"
            >
              Notice sent for {formatDate(vacateDate)}. Waiting for your landlord to confirm.
              <button
                type="button"
                onClick={() => {
                  setVacateDate(null);
                  toast('Notice withdrawn', 'info');
                }}
                className="mt-1 block min-h-11 text-sm font-bold underline"
              >
                Withdraw notice
              </button>
            </div>
          ) : !open ? (
            <Button variant="secondary" onClick={() => setOpen(true)}>
              Give notice to vacate
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <Field
                label="Move-out date"
                htmlFor="vacate"
                error={error}
                help={`Earliest allowed date: ${formatDate(min)} (${MIN_NOTICE_DAYS} days from today).`}
              >
                <Input
                  id="vacate"
                  type="date"
                  min={min}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setError(undefined);
                  }}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={send}>Send notice</Button>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="dc" className="flex flex-col gap-2">
          <h2 id="dc" className="m-0 text-base font-extrabold">
            Documents
          </h2>
          {TENANT_DOCS.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3"
            >
              <span className="flex flex-col">
                <strong className="text-sm">{d.title}</strong>
                <span className="text-xs text-muted">{d.sub}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                aria-label={`Download ${d.title.toLowerCase()}`}
                onClick={() => toast(`${d.title} downloaded (demo)`, 'ok')}
              >
                Download
              </Button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
