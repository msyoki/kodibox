'use client';

import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  Field,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { listMembers, type Member } from '@/demo';
import { formatWhen } from '@/demo/format';
import { useDemoStore } from '@/demo/store';

type Role = Member['role'];

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  accountant: 'Accountant',
  caretaker: 'Caretaker',
};

const MATRIX: { cap: string; roles: Record<Role, boolean> }[] = [
  {
    cap: 'View properties, tenants and payments',
    roles: { owner: true, manager: true, accountant: true, caretaker: true },
  },
  {
    cap: 'Record cash payments (maker)',
    roles: { owner: true, manager: true, accountant: false, caretaker: true },
  },
  {
    cap: 'Approve cash payments (checker)',
    roles: { owner: true, manager: true, accountant: false, caretaker: false },
  },
  {
    cap: 'Match unmatched M-Pesa payments',
    roles: { owner: true, manager: true, accountant: true, caretaker: false },
  },
  {
    cap: 'Reverse a payment (never delete)',
    roles: { owner: true, manager: false, accountant: true, caretaker: false },
  },
  {
    cap: 'Remit to landlords',
    roles: { owner: true, manager: false, accountant: true, caretaker: false },
  },
  {
    cap: 'Export reports and tax figures',
    roles: { owner: true, manager: true, accountant: true, caretaker: false },
  },
  {
    cap: 'Manage team, billing and privacy',
    roles: { owner: true, manager: false, accountant: false, caretaker: false },
  },
];

export function TeamView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const [extra, setExtra] = useState<Member[]>([]);
  const members = [...listMembers(data), ...extra];
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('manager');
  const [error, setError] = useState('');

  function invite() {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setExtra((cur) => [
      ...cur,
      {
        id: `mem_new_${cur.length + 1}`,
        name: email.split('@')[0] ?? email,
        email,
        role,
        twoFactor: false,
        lastActive: '',
      },
    ]);
    toast(`Invite sent to ${email} as ${ROLE_LABEL[role]}`, 'ok');
    setOpen(false);
    setEmail('');
    setError('');
  }

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="team">
        <CardHeader
          title="Team & roles"
          id="team"
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              Invite member
            </Button>
          }
        />
        <Table minWidth={560}>
          <THead>
            <TR>
              <TH>Member</TH>
              <TH>Role</TH>
              <TH>2FA</TH>
              <TH>Last active</TH>
            </TR>
          </THead>
          <TBody>
            {members.map((m) => (
              <TR key={m.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} size="sm" />
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted">{m.email}</div>
                    </div>
                  </div>
                </TD>
                <TD>{ROLE_LABEL[m.role]}</TD>
                <TD>
                  <Badge tone={m.twoFactor ? 'ok' : 'warn'}>{m.twoFactor ? 'On' : 'Off'}</Badge>
                </TD>
                <TD>{m.lastActive ? formatWhen(m.lastActive) : 'Invited'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card aria-labelledby="matrix">
        <CardHeader title="Permission matrix" id="matrix" />
        <Table minWidth={560}>
          <THead>
            <TR>
              <TH>Capability</TH>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <TH key={r}>{ROLE_LABEL[r]}</TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {MATRIX.map((row) => (
              <TR key={row.cap}>
                <TD>{row.cap}</TD>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <TD key={r}>
                    {row.roles[r] ? (
                      <span className="font-bold text-ok">
                        Yes<span className="sr-only"> for {ROLE_LABEL[r]}</span>
                      </span>
                    ) : (
                      <span className="text-muted">
                        No<span className="sr-only"> for {ROLE_LABEL[r]}</span>
                      </span>
                    )}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
        <p className="mt-3 mb-0 text-xs text-muted">
          The person who records cash can never approve it: maker-checker. Nobody can delete a
          payment, only reverse it.
        </p>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Invite team member"
        description="They get an email link and must set up 2FA before first use."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={invite}>Send invite</Button>
          </>
        }
      >
        <Field label="Email" htmlFor="inv-email" error={error}>
          <Input
            id="inv-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
          />
        </Field>
        <Field label="Role" htmlFor="inv-role">
          <Select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(['manager', 'accountant', 'caretaker'] as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
      </Dialog>
    </div>
  );
}
