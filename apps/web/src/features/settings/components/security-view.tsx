'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { listMembers } from '@/demo';
import { useDemoStore } from '@/demo/store';

const SESSIONS = [
  {
    id: 'se1',
    device: 'Chrome on Windows',
    place: 'Nairobi, KE',
    when: 'This session',
    current: true,
  },
  {
    id: 'se2',
    device: 'Safari on iPhone',
    place: 'Nairobi, KE',
    when: 'Yesterday 18:40',
    current: false,
  },
  { id: 'se3', device: 'Chrome on Android', place: 'Mombasa, KE', when: '29 Oct', current: false },
];

const ENFORCED = ['owner', 'manager', 'accountant'];

export function SecurityView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const [sessions, setSessions] = useState(SESSIONS);
  const members = listMembers(data);

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="twofa">
        <CardHeader title="Two-factor authentication" id="twofa" />
        <p className="mt-0 text-sm text-muted">
          2FA is enforced for owners, managers and accountants. Caretakers are recommended to enable
          it.
        </p>
        <Table minWidth={480}>
          <THead>
            <TR>
              <TH>Member</TH>
              <TH>Role</TH>
              <TH>2FA</TH>
            </TR>
          </THead>
          <TBody>
            {members.map((m) => {
              const required = ENFORCED.includes(m.role);
              return (
                <TR key={m.id}>
                  <TD>{m.name}</TD>
                  <TD className="capitalize">{m.role}</TD>
                  <TD>
                    <Badge tone={m.twoFactor ? 'ok' : required ? 'danger' : 'warn'}>
                      {m.twoFactor ? 'On' : required ? 'Required, off' : 'Recommended, off'}
                    </Badge>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Card aria-labelledby="sessions">
        <CardHeader title="Active sessions" id="sessions" />
        {sessions.length === 0 ? (
          <p className="m-0 text-sm text-muted">No other sessions.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 border-t border-divider py-2 first:border-t-0"
              >
                <div>
                  <div className="font-semibold">
                    {s.device} {s.current ? <Badge tone="ok">Current</Badge> : null}
                  </div>
                  <div className="text-xs text-muted">
                    {s.place} · {s.when}
                  </div>
                </div>
                {s.current ? null : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setSessions((cur) => cur.filter((x) => x.id !== s.id));
                      toast(`Session revoked: ${s.device}`, 'ok');
                    }}
                  >
                    Revoke<span className="sr-only"> {s.device}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
