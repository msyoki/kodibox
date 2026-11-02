'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components/ui';
import { Mark, ScreenHeader } from '@/components/mobile-ui/screen';
import { cn } from '@/lib/cn';

interface Alert {
  id: string;
  mark: string;
  tone: 'ok' | 'warn' | 'danger' | 'info';
  title: string;
  body: string;
  time: string;
  unread: boolean;
  action?: { label: string; toast: string };
}

const ALERTS: Alert[] = [
  {
    id: 'a1',
    mark: 'Pay',
    tone: 'ok',
    title: 'Payment received',
    body: 'KES 14,000 · A-03 · TK2F9RT4KD',
    time: '9:12',
    unread: true,
  },
  {
    id: 'a2',
    mark: 'Pay',
    tone: 'ok',
    title: 'Payment received',
    body: 'KES 9,500 · A-11 · TK3H7LP1QW',
    time: '8:40',
    unread: true,
  },
  {
    id: 'a3',
    mark: 'Tkt',
    tone: 'danger',
    title: '2 tickets past SLA',
    body: 'TCK-0141 overdue 5h · TCK-0138 escalated to Owner',
    time: '10:05',
    unread: true,
  },
  {
    id: 'a4',
    mark: 'Sms',
    tone: 'danger',
    title: 'SMS failed to send',
    body: '3 reminders for Mvule Apartments not delivered',
    time: 'Yesterday',
    unread: false,
    action: { label: 'Retry', toast: 'Retrying 3 reminders' },
  },
  {
    id: 'a5',
    mark: 'Ls',
    tone: 'warn',
    title: 'Lease ending in 30 days',
    body: 'C-03 · Rose Otieno · ends 2 Dec',
    time: 'Sat',
    unread: false,
  },
  {
    id: 'a6',
    mark: 'Tax',
    tone: 'warn',
    title: 'MRI tax due 20 Nov',
    body: 'October gross rent KES 1,032,500 ready to review',
    time: 'Fri',
    unread: false,
  },
  {
    id: 'a7',
    mark: 'Sec',
    tone: 'danger',
    title: 'Security alert: new sign-in',
    body: 'Chrome on Windows, Nairobi. Not you? Sign out all devices.',
    time: 'Thu',
    unread: true,
    action: { label: 'Sign out all devices', toast: 'Signed out of all other devices' },
  },
];

export function ManagerAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState(ALERTS);
  const unread = alerts.filter((a) => a.unread).length;

  const markRead = (id: string) =>
    setAlerts((as) => as.map((a) => (a.id === id ? { ...a, unread: false } : a)));

  return (
    <>
      <ScreenHeader
        title="Alerts"
        right={
          <Button
            size="sm"
            variant="secondary"
            disabled={unread === 0}
            onClick={() => {
              setAlerts((as) => as.map((a) => ({ ...a, unread: false })));
              toast('All alerts marked read', 'ok');
            }}
          >
            Mark all read
          </Button>
        }
      />
      <p className="m-0 px-4 pt-3 text-xs text-muted" aria-live="polite">
        {unread} unread
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-4 pt-2">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={cn(
              'flex items-start gap-3 rounded-card border p-3',
              a.unread ? 'border-border-strong bg-surface' : 'border-border bg-soft',
            )}
          >
            <Mark tone={a.tone}>{a.mark}</Mark>
            <div className="min-w-0 flex-1">
              <p className="m-0 flex items-center gap-2 text-sm">
                <strong>{a.title}</strong>
                {a.unread ? (
                  <span className="size-2 rounded-full bg-amber" aria-label="Unread" />
                ) : null}
              </p>
              <p className="m-0 text-xs text-muted">{a.body}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {a.action ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      toast(a.action?.toast ?? '', 'ok');
                      markRead(a.id);
                    }}
                  >
                    {a.action.label}
                  </Button>
                ) : null}
                {a.unread ? (
                  <Button size="sm" variant="ghost" onClick={() => markRead(a.id)}>
                    Mark read
                  </Button>
                ) : null}
              </div>
            </div>
            <span className="flex-none text-xs text-muted">{a.time}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 px-4 text-center text-xs text-muted">
        Push notifications never show tenant names or amounts on the lock screen.
      </p>
    </>
  );
}
