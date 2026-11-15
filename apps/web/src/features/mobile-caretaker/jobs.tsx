'use client';

import { useState } from 'react';
import { Badge, Button, Card, Field, Input, useToast } from '@/components/ui';
import { PhotoButton, ScreenHeader, Section } from '@/components/mobile-ui/screen';
import { cn } from '@/lib/cn';

const STEPS = ['Reported', 'Assigned', 'In progress', 'Done'] as const;

const OTHER_JOBS = [
  {
    id: 'wo-0229',
    title: 'Gate lock sticking, Main gate',
    where: 'Baraka Flats',
    status: 'Assigned',
  },
  {
    id: 'wo-0226',
    title: 'Bulb replacement, stairwell C',
    where: 'Mvule Apartments',
    status: 'Assigned',
  },
];

export function CaretakerJobs() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(2);
  const [cost, setCost] = useState('1,800');
  const [receipt, setReceipt] = useState(false);
  const [error, setError] = useState<string>();

  const markDone = () => {
    if (!receipt) {
      setError('Add a photo of the receipt so the manager can approve the cost.');
      return;
    }
    setError(undefined);
    setStep(3);
    toast('Marked done · tenant notified', 'ok');
  };

  if (!open) {
    return (
      <>
        <ScreenHeader eyebrow="Work orders" title="My jobs" />
        <Section title="Open jobs" id="open">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            <li>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-14 w-full items-center gap-3 rounded-card border border-border bg-surface px-3 py-2 text-left hover:bg-brand-tint"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">Kitchen sink leaking, B-12</strong>
                  <span className="text-xs text-muted">WO-0231 · Riverside Court</span>
                </span>
                <Badge tone={step === 3 ? 'ok' : 'info'}>{STEPS[step]}</Badge>
              </button>
            </li>
            {OTHER_JOBS.map((j) => (
              <li
                key={j.id}
                className="flex min-h-14 items-center gap-3 rounded-card border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">{j.title}</strong>
                  <span className="text-xs text-muted">
                    {j.id.toUpperCase()} · {j.where}
                  </span>
                </span>
                <Badge tone="neutral">{j.status}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        eyebrow="Work order WO-0231 · Riverside Court"
        title="Kitchen sink leaking, B-12"
        right={
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            All jobs
          </Button>
        }
      />
      <Section title="Details" id="det">
        <Card className="flex flex-col gap-3">
          <p className="m-0 text-sm">
            Water drips under the sink when the tap runs. Cupboard floor is wet. Reported by Peter
            Otieno on 31 Oct. Tenant home after 5 pm.
          </p>
          <div className="flex gap-2" aria-label="Photos from tenant">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                aria-hidden="true"
                className="grid size-16 place-items-center rounded-control bg-soft text-xs text-muted"
              >
                Photo {n}
              </span>
            ))}
          </div>
          <p className="m-0 text-xs text-muted">3 photos from tenant</p>
        </Card>
      </Section>
      <Section title="Status" id="st">
        <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col gap-1.5 text-center text-xs">
              <span
                className={cn(
                  'h-1.5 rounded-full',
                  i < step ? 'bg-brand' : i === step ? 'bg-amber' : 'bg-divider',
                )}
              />
              <span className={cn(i === step ? 'font-bold' : 'text-muted')}>
                {s}
                {i === step ? <span className="sr-only"> (current)</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Cost and receipt" id="cost">
        <Card className="flex flex-col gap-3">
          <Field label="Cost (KES)" htmlFor="job-cost">
            <Input
              id="job-cost"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={step === 3}
            />
          </Field>
          <PhotoButton
            added={receipt}
            onToggle={() => setReceipt((r) => !r)}
            label="Receipt photo"
          />
          {error ? (
            <span role="alert" className="text-xs font-medium text-danger">
              {error}
            </span>
          ) : null}
          <p className="m-0 text-xs text-muted">
            Cost goes to the manager as an expense for approval.
          </p>
        </Card>
      </Section>
      <div className="px-4 pt-4">
        <Button size="lg" className="w-full" onClick={markDone} disabled={step === 3}>
          {step === 3 ? 'Done' : 'Mark done'}
        </Button>
        <p className="m-0 mt-2 text-center text-xs text-muted">
          Peter Otieno gets an SMS and app notification (unless he opted out).
        </p>
      </div>
    </>
  );
}
