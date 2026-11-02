'use client';

import { useState } from 'react';
import { Button, Card, Checkbox, Field, Input, Textarea, useToast } from '@/components/ui';
import { ScreenHeader } from '@/components/mobile-ui/screen';
import { cn } from '@/lib/cn';

type Condition = 'Good' | 'Fair' | 'Damaged';

const CHIP_TONE: Record<Condition, string> = {
  Good: 'border-ok bg-ok-soft text-ok',
  Fair: 'border-warn bg-warn-soft text-warn',
  Damaged: 'border-danger bg-danger-soft text-danger',
};

const ROOMS: { name: string; photos: number; condition: Condition; note: string }[] = [
  { name: 'Living room', photos: 3, condition: 'Good', note: 'Walls clean, floor tiles intact.' },
  { name: 'Kitchen', photos: 4, condition: 'Fair', note: 'Sink stained, cabinet hinge loose.' },
  { name: 'Bedroom', photos: 2, condition: 'Good', note: 'Repainted wall by tenant, no damage.' },
  {
    name: 'Bathroom',
    photos: 5,
    condition: 'Damaged',
    note: 'Cracked basin, shower head missing.',
  },
];

export function CaretakerInspection() {
  const { toast } = useToast();
  const [rooms, setRooms] = useState(ROOMS);
  const [meter, setMeter] = useState('1,842');
  const [keys, setKeys] = useState(true);
  const [signed, setSigned] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const update = (i: number, patch: Partial<(typeof ROOMS)[number]>) =>
    setRooms((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = () => {
    if (!signed) {
      setError('The tenant must sign before you submit.');
      return;
    }
    setError(undefined);
    setSubmitted(true);
    toast('Inspection submitted to the manager', 'ok');
  };

  return (
    <>
      <ScreenHeader
        backHref="/m/caretaker"
        eyebrow="Baraka Flats · Brian Kiptoo"
        title="Move-out inspection A-07"
      />
      <div className="flex flex-col gap-3 px-4 pt-4">
        {rooms.map((r, i) => (
          <Card key={r.name} className="flex flex-col gap-3">
            <section aria-label={r.name} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-[15px] font-bold">{r.name}</h2>
                <button
                  type="button"
                  onClick={() => update(i, { photos: r.photos + 1 })}
                  className="min-h-11 rounded-control px-2 text-xs font-semibold text-brand hover:bg-brand-tint"
                >
                  {r.photos} photos · add
                </button>
              </div>
              <div role="group" aria-label={`${r.name} condition`} className="flex gap-2">
                {(['Good', 'Fair', 'Damaged'] as Condition[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={r.condition === c}
                    onClick={() => update(i, { condition: c })}
                    className={cn(
                      'min-h-11 flex-1 rounded-control border text-[13px] font-bold',
                      r.condition === c
                        ? CHIP_TONE[c]
                        : 'border-border bg-surface text-muted hover:bg-divider',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <Textarea
                aria-label={`${r.name} notes`}
                value={r.note}
                onChange={(e) => update(i, { note: e.target.value })}
                className="min-h-16"
              />
            </section>
          </Card>
        ))}
        <Card className="flex flex-col gap-3">
          <section aria-label="Final handover" className="flex flex-col gap-3">
            <Field label="Final water reading" htmlFor="final-meter">
              <Input
                id="final-meter"
                inputMode="numeric"
                value={meter}
                onChange={(e) => setMeter(e.target.value)}
              />
            </Field>
            <Checkbox
              label="2 keys returned"
              checked={keys}
              onChange={(e) => setKeys(e.target.checked)}
            />
            <div
              className={cn(
                'grid min-h-24 place-items-center rounded-control border border-dashed text-sm',
                signed
                  ? 'border-ok bg-ok-soft font-bold text-ok'
                  : 'border-border-strong text-muted',
              )}
            >
              {signed ? 'Signed by Brian Kiptoo' : 'Tenant signature here'}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSigned(true)}>
                Tenant signs
              </Button>
              <Button variant="ghost" onClick={() => setSigned(false)}>
                Clear
              </Button>
            </div>
            {error ? (
              <span role="alert" className="text-xs font-medium text-danger">
                {error}
              </span>
            ) : null}
          </section>
        </Card>
        <Button size="lg" onClick={submit} disabled={submitted}>
          {submitted ? 'Inspection submitted' : 'Submit inspection'}
        </Button>
        <p className="m-0 text-center text-xs text-muted">
          Saved on this phone. The manager reviews any deposit deductions.
        </p>
      </div>
    </>
  );
}
