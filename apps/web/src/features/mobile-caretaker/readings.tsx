'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, Money, ProgressBar, useToast } from '@/components/ui';
import { PhotoButton, ScreenHeader, Section } from '@/components/mobile-ui/screen';
import { useDemoStore } from '@/demo/store';
import { listReadingQueue } from '@/demo/mobile';

export function CaretakerReadings() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const queue = useMemo(() => listReadingQueue(data), [data]);
  const [done, setDone] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(() =>
    Math.max(
      0,
      queue.findIndex((q) => q.current === null),
    ),
  );
  const [value, setValue] = useState('');
  const [photo, setPhoto] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(3);

  const total = queue.length;
  const recordedBefore = queue.filter((q) => q.current !== null).length;
  const doneCount = recordedBefore + Object.keys(done).length;
  const cur = queue[idx];
  const reading = Number(value.replace(/,/g, ''));
  const valid = value.trim() !== '' && Number.isFinite(reading) && reading >= (cur?.previous ?? 0);
  const consumption = valid && cur ? reading - cur.previous : 0;
  const amount = cur ? consumption * cur.ratePerUnit : 0;
  const isPending = (q: { id: string; current: number | null }) =>
    q.current === null && !(q.id in done);
  const upNext = queue.filter((q, i) => i > idx && isPending(q)).slice(0, 3);

  if (!cur) return null;

  const save = () => {
    if (!valid) {
      setError(
        value.trim() === ''
          ? 'Enter the meter reading.'
          : `Reading cannot be lower than the last one (${cur.previous}).`,
      );
      return;
    }
    if (!photo) {
      setError('Add a photo of the meter first.');
      return;
    }
    setError(undefined);
    setDone((d) => ({ ...d, [cur.id]: reading }));
    setSaved((s) => s + 1);
    toast(`${cur.unitCode} saved on this phone`, 'ok');
    const next = queue.findIndex((q, i) => i > idx && isPending(q));
    if (next >= 0) setIdx(next);
    setValue('');
    setPhoto(false);
  };

  const finished = doneCount >= total;

  return (
    <>
      <ScreenHeader eyebrow="Mvule Apartments · November" title="Water readings" />
      <div className="px-4 pt-3">
        <p className="m-0 mb-2 flex justify-between text-sm">
          <strong>
            {doneCount} of {total} units done
          </strong>
          <span className="text-muted">Due by 28 Nov</span>
        </p>
        <ProgressBar value={(doneCount / total) * 100} label="Readings progress" />
        <p
          role="status"
          className="m-0 mt-3 rounded-control bg-info-soft px-3 py-2 text-sm font-semibold text-info"
        >
          Offline · {saved} readings saved on this phone, will sync automatically
        </p>
      </div>
      {finished ? (
        <Section title="All readings done" id="fin">
          <Card>
            All {total} units are read. The manager reviews unusual readings before invoicing.
          </Card>
        </Section>
      ) : (
        <Section title={`Unit ${cur.unitCode}`} id="cur">
          <Card className="flex flex-col gap-3">
            <p className="m-0 text-xs text-muted">Meter {cur.meter}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Last reading (Oct)</span>
              <span className="font-mono font-medium">{cur.previous.toLocaleString('en-KE')}</span>
            </div>
            <Field label="New reading" htmlFor="new-reading" error={error}>
              <Input
                id="new-reading"
                inputMode="numeric"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(undefined);
                }}
                placeholder={String(cur.previous)}
              />
            </Field>
            <div className="flex items-center justify-between gap-2 rounded-control bg-brand-tint px-3 py-2 text-sm">
              <span className="text-muted">
                {consumption} units × <Money minor={cur.ratePerUnit} />
              </span>
              <strong>
                <Money minor={amount} />
              </strong>
            </div>
            <PhotoButton
              added={photo}
              onToggle={() => setPhoto((p) => !p)}
              label="Add meter photo (required)"
            />
            <Button size="lg" onClick={save}>
              Save &amp; next unit
            </Button>
          </Card>
        </Section>
      )}
      <Section title="Up next" id="up">
        {upNext.length === 0 ? (
          <p className="m-0 text-sm text-muted">No more units in the queue.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {upNext.map((u) => (
              <li
                key={u.id}
                className="flex justify-between rounded-card border border-border bg-surface px-3 py-3 text-sm"
              >
                <strong>{u.unitCode}</strong>
                <span className="text-muted">Last: {u.previous.toLocaleString('en-KE')}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
