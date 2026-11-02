'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Dialog,
  Field,
  Input,
  MaskedText,
  Money,
  Select,
  Switch,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
  useToast,
} from '@/components/ui';
import { formatWhen } from '@/demo/format';
import { getOrganization, listMessages, listTenants, listTemplates, type Template } from '@/demo';
import { useDemoStore } from '@/demo/store';

const MERGE_FIELDS = ['{{name}}', '{{unit}}', '{{amount}}', '{{due}}', '{{month}}', '{{ref}}'];

const SCHEDULE = [
  {
    id: 's1',
    when: '3 days before due date',
    what: 'Friendly reminder with balance and paybill',
    on: true,
  },
  { id: 's2', when: 'On the due date', what: 'Due today, pay by M-Pesa', on: true },
  { id: 's3', when: '3 days overdue', what: 'Overdue notice with late fee info', on: true },
  { id: 's4', when: 'Weekly after that', what: 'Every Monday until paid or paused', on: false },
];

const WALLET_MINOR = 425_000;
const SMS_COST_MINOR = 80;

const AUDIENCES = [
  { id: 'mvule', label: 'All tenants, Mvule Apartments', count: 42 },
  { id: 'all', label: 'All properties (excluding opt-outs)', count: 142 },
  { id: 'arrears', label: 'Tenants with arrears', count: 23 },
];

export function MessagesView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const org = getOrganization(data);
  const messages = listMessages(data);
  const optOuts = listTenants({}, data).filter((t) => t.smsOptOut);

  const [schedule, setSchedule] = useState(SCHEDULE);
  const [quiet, setQuiet] = useState(true);
  const [templates, setTemplates] = useState<Template[]>(listTemplates(data));
  const [editing, setEditing] = useState<Template | null>(null);
  const [draft, setDraft] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUp, setTopUp] = useState('1000');
  const [wallet, setWallet] = useState(WALLET_MINOR);
  const [audience, setAudience] = useState('mvule');
  const [promo, setPromo] = useState(false);
  const [body, setBody] = useState(
    'Hello {{name}}, water at Mvule will be off on Thursday 5 Nov, 9am to 1pm, for tank cleaning. Sorry for the inconvenience.',
  );

  const aud = AUDIENCES.find((a) => a.id === audience) ?? AUDIENCES[0]!;
  const cost = aud.count * SMS_COST_MINOR;
  const topUpAmount = Math.round(Number(topUp) * 100);

  function openEdit(t: Template) {
    setEditing(t);
    setDraft(t.body);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Messages & reminders"
        eyebrow={`Sender ID ${org.smsSenderId} · SMS and in-app`}
        actions={<Button onClick={() => setTopUpOpen(true)}>Top up SMS wallet</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card aria-labelledby="sched">
            <CardHeader title="Reminder schedule" id="sched" />
            <ul className="m-0 list-none p-0">
              {schedule.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-t border-divider first:border-t-0"
                >
                  <div className="py-2">
                    <div className="font-semibold">{s.when}</div>
                    <div className="text-sm text-muted">{s.what}</div>
                  </div>
                  <Switch
                    label={<span className="sr-only">{s.when}</span>}
                    checked={s.on}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setSchedule((cur) => cur.map((x) => (x.id === s.id ? { ...x, on } : x)));
                      toast(`${s.when}: reminder ${on ? 'on' : 'off'}`, 'ok');
                    }}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3">
              <div>
                <div className="font-semibold">Quiet hours 21:00 – 07:00</div>
                <div className="text-sm text-muted">Reminders wait until morning.</div>
              </div>
              <Switch
                label={<span className="sr-only">Quiet hours</span>}
                checked={quiet}
                onChange={(e) => {
                  setQuiet(e.target.checked);
                  toast(`Quiet hours ${e.target.checked ? 'on' : 'off'}`, 'ok');
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-divider pt-3">
              <div>
                <div className="font-semibold">Sender ID</div>
                <div className="text-sm text-muted">Registered and approved</div>
              </div>
              <Badge tone="ok">{org.smsSenderId}</Badge>
            </div>
          </Card>

          <Card aria-labelledby="tpl">
            <CardHeader title="Message templates" id="tpl" />
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {templates.map((t) => (
                <li key={t.id} className="rounded-control border border-divider p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">
                      {t.name} <Badge tone="info">{t.channel.toUpperCase()}</Badge>
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      Edit<span className="sr-only"> {t.name}</span>
                    </Button>
                  </div>
                  <p className="mt-1 mb-0 text-sm text-muted">{t.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 mb-0 text-xs text-muted">
              Merge fields:{' '}
              {MERGE_FIELDS.map((f) => (
                <code key={f} className="mr-1.5 font-mono">
                  {f}
                </code>
              ))}
            </p>
          </Card>
        </div>

        <Card aria-labelledby="wallet" className="h-fit">
          <CardHeader title="SMS wallet" id="wallet" />
          <div className="text-[28px]">
            <Money minor={wallet} />
          </div>
          <p className="mt-1 text-sm text-muted">
            about {Math.floor(wallet / SMS_COST_MINOR).toLocaleString('en-US')} SMS at KES 0.80 each
          </p>
          <p className="text-sm text-muted">
            November use so far: 3,240 SMS. Estimated 4,100 for the month.
          </p>
          <Button className="w-full" onClick={() => setTopUpOpen(true)}>
            Top up via M-Pesa
          </Button>
          <p className="mt-3 mb-0 text-xs text-muted">
            Top-ups are a Kodibox service fee paid by STK push. This is separate from tenant rent,
            which never passes through Kodibox.
          </p>
        </Card>
      </div>

      <Card aria-labelledby="log">
        <CardHeader title="Delivery log" id="log" />
        <Table minWidth={560}>
          <THead>
            <TR>
              <TH>Time</TH>
              <TH>Audience</TH>
              <TH align="right">Recipients</TH>
              <TH>Channel</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {messages.map((m) => (
              <TR key={m.id}>
                <TD>{formatWhen(m.sentAt)}</TD>
                <TD>
                  {m.audience}
                  <div className="text-xs text-muted">{m.body}</div>
                </TD>
                <TD align="right">{m.recipients}</TD>
                <TD>{m.channel.toUpperCase()}</TD>
                <TD>
                  <Badge
                    tone={m.status === 'sent' ? 'ok' : m.status === 'failed' ? 'danger' : 'warn'}
                  >
                    {m.status === 'sent'
                      ? 'Delivered'
                      : m.status === 'failed'
                        ? 'Failed'
                        : 'Scheduled'}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="optouts">
          <CardHeader title="Opt-outs (replied STOP)" id="optouts" />
          {optOuts.length === 0 ? (
            <p className="text-sm text-muted">No opt-outs.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {optOuts.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between gap-3 border-t border-divider py-2.5 first:border-t-0"
                >
                  <span>{t.name}</span>
                  <MaskedText kind="phone" value={t.phone} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 mb-0 text-xs text-muted">
            Opted-out tenants no longer get reminders or promotions. Only transactional receipts and
            legal notices are still sent.
          </p>
        </Card>

        <Card aria-labelledby="bulk">
          <CardHeader title="Bulk message" id="bulk" />
          <div className="flex flex-col gap-3">
            <Field label="Send to" htmlFor="aud">
              <Select id="aud" value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({a.count})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Message" htmlFor="bulk-body">
              <Textarea id="bulk-body" value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Checkbox
              label="This is a promotion or offer"
              checked={promo}
              onChange={(e) => setPromo(e.target.checked)}
            />
            <p
              role="note"
              className={`m-0 rounded-control p-3 text-sm ${promo ? 'bg-warn-soft text-warn' : 'bg-info-soft text-info'}`}
            >
              Marketing needs opt-in. Service notices (outages, rent, lease) can go to all tenants.
              Promotions or offers go only to tenants who agreed to receive them and always carry an
              opt-out line. Opted-out tenants are skipped automatically.
            </p>
            <p className="m-0 text-sm text-muted">
              {aud.count} recipients · 1 SMS each · about <Money minor={cost} /> · sends outside
              quiet hours
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" onClick={() => toast('Test SMS sent to you', 'ok')}>
                Send test to me
              </Button>
              <Button
                disabled={body.trim().length === 0}
                onClick={() => {
                  setWallet((w) => Math.max(0, w - cost));
                  toast(`Queued for ${aud.count} tenants${promo ? ' (opted-in only)' : ''}`, 'ok');
                }}
              >
                Send to {aud.count} tenants
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title="Top up SMS wallet"
        description="You will get an M-Pesa STK push on your phone. This is a Kodibox service fee, not tenant rent."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTopUpOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!(topUpAmount >= 10_000)}
              onClick={() => {
                setWallet((w) => w + topUpAmount);
                setTopUpOpen(false);
                toast('STK push sent. Wallet topped up.', 'ok');
              }}
            >
              Send STK push
            </Button>
          </>
        }
      >
        <Field label="Amount (KES)" htmlFor="topup" help="Minimum KES 100">
          <Input
            id="topup"
            inputMode="numeric"
            value={topUp}
            onChange={(e) => setTopUp(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit template: ${editing?.name ?? ''}`}
        description="Reminders must keep the opt-out line."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editing) {
                  setTemplates((cur) =>
                    cur.map((t) => (t.id === editing.id ? { ...t, body: draft } : t)),
                  );
                }
                setEditing(null);
                toast('Template saved', 'ok');
              }}
            >
              Save template
            </Button>
          </>
        }
      >
        <Field
          label="Template text"
          htmlFor="tpl-body"
          help={`Merge fields: ${MERGE_FIELDS.join(' ')}`}
        >
          <Textarea id="tpl-body" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}
