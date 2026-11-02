'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, useToast } from '@/components/ui';
import { Mark, ScreenHeader, Section } from '@/components/mobile-ui/screen';

const TASKS = [
  {
    href: '/m/caretaker/readings',
    mark: 'Rd',
    title: 'Readings due: 6 units',
    sub: 'Mvule Apartments · by 28 Nov',
    badge: 'Due',
    tone: 'warn' as const,
  },
  {
    href: '/m/caretaker/inspection',
    mark: 'Mo',
    title: 'Move-out inspection A-07',
    sub: 'Baraka Flats · 2:00 pm',
    badge: '2 pm',
    tone: 'info' as const,
  },
  {
    href: '/m/caretaker/jobs',
    mark: 'Jb',
    title: 'Fix sink B-12',
    sub: 'Riverside Court · Kitchen sink leaking',
    badge: 'In progress',
    tone: 'info' as const,
  },
  {
    href: '/m/caretaker/cash',
    mark: 'Ca',
    title: 'Collect cash receipts',
    sub: '2 receipts recorded',
    badge: 'Done',
    tone: 'ok' as const,
  },
];

const QUEUE = [
  { label: '3 meter readings with photos', when: '8:15 am' },
  { label: 'Cash entry KES 14,000 · A-03', when: '9:05 am' },
];

export function CaretakerHome() {
  const { toast } = useToast();
  const [queue, setQueue] = useState(QUEUE);
  const [syncedAt, setSyncedAt] = useState('9:42 am');

  const sync = () => {
    setQueue([]);
    setSyncedAt('10:00 am');
    toast('Everything synced', 'ok');
  };

  return (
    <>
      <ScreenHeader
        eyebrow="Baraka Flats · Mvule Apartments"
        title="Today, Mon 2 Nov"
        right={<Mark tone="brand">OO</Mark>}
      />
      <div className="px-4 pt-3">
        {queue.length > 0 ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-control bg-warn-soft px-3 py-2 text-sm font-semibold text-warn"
          >
            <span className="flex-1">Offline · 4 items waiting to sync</span>
            <Button size="sm" variant="secondary" onClick={sync}>
              Sync now
            </Button>
          </div>
        ) : (
          <div
            role="status"
            className="rounded-control bg-ok-soft px-3 py-2 text-sm font-semibold text-ok"
          >
            All synced
          </div>
        )}
        <p className="m-0 mt-3 text-sm">
          <strong>1 of 4 tasks done</strong>{' '}
          <span className="text-muted">· Last synced {syncedAt}</span>
        </p>
      </div>
      <Section title="Today's tasks" id="tasks">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {TASKS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="flex min-h-14 items-center gap-3 rounded-card border border-border bg-surface px-3 py-2 text-text no-underline hover:bg-brand-tint"
              >
                <Mark>{t.mark}</Mark>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">{t.title}</strong>
                  <span className="text-xs text-muted">{t.sub}</span>
                </span>
                <Badge tone={t.tone}>{t.badge}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Waiting to sync" id="sync">
        {queue.length === 0 ? (
          <p className="m-0 text-sm text-muted">
            Nothing waiting. Entries sync automatically when you are online.
          </p>
        ) : (
          <Card className="p-0">
            <ul className="m-0 list-none divide-y divide-divider p-0">
              {queue.map((q) => (
                <li key={q.label} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span>{q.label}</span>
                  <span className="text-muted">{q.when}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>
    </>
  );
}
