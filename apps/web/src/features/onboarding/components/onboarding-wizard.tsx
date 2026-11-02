'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/shell/logo';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const STEPS = [
  'Organization',
  'Property',
  'Units',
  'Connect M-Pesa',
  'Import tenants',
  'First invoices',
] as const;

type Connection = 'idle' | 'testing' | 'ok';

const SAMPLE_ROWS = [
  ['B-12', 'Peter Otieno', '0712 ••• 512', '14,000'],
  ['C-02', 'Mercy Achieng', '0722 ••• 804', '15,000'],
  ['A-04', 'Grace Wambui', '0733 ••• 219', '21,000'],
  ['A-11', 'Faith Njeri', '0701 ••• 377', '9,500'],
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(3);
  const [kind, setKind] = useState<'paybill' | 'till'>('paybill');
  const [conn, setConn] = useState<Connection>('idle');
  const [imported, setImported] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function testConnection() {
    setConn('testing');
    timer.current = setTimeout(() => setConn('ok'), 700);
  }

  const last = step === STEPS.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-[clamp(16px,3vw,40px)] py-4">
        <div className="flex items-center gap-2.5">
          <Logo tone="dark" />
          <span className="text-xl font-extrabold">Kodibox</span>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold">
          Save and finish later
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-[clamp(16px,3vw,40px)] pt-8 pb-14">
        <ol aria-label="Setup steps" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {STEPS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'now' : 'next';
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={state === 'now' ? 'step' : undefined}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-full py-0 pr-3.5 pl-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    state === 'now' && 'bg-brand font-extrabold text-white',
                    state === 'done' && 'bg-ok-soft font-semibold text-ok',
                    state === 'next' && 'border border-border bg-surface font-semibold text-muted',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-7 items-center justify-center rounded-full text-[13px] font-extrabold',
                      state === 'now' && 'bg-amber text-text',
                      state === 'done' && 'bg-ok text-white',
                      state === 'next' && 'bg-divider text-[#4a524e]',
                    )}
                  >
                    {state === 'done' ? '✓' : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-start gap-6">
          <section
            aria-labelledby="wiz-h"
            className="flex min-w-0 flex-[3_1_520px] flex-col gap-[22px] rounded-panel border border-border bg-surface p-[clamp(20px,3vw,32px)]"
          >
            <div>
              <p className="m-0 text-[13px] font-bold tracking-wider text-muted uppercase">
                Step {step + 1} of {STEPS.length}
              </p>
              <h1 id="wiz-h" className="mt-1.5 mb-2 text-[28px] font-extrabold tracking-tight">
                {TITLES[step]}
              </h1>
              <p className="m-0 text-[15px] leading-relaxed text-[#3f4743]">{INTROS[step]}</p>
            </div>

            {step === 0 ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                <Field label="Organization name" htmlFor="org-name">
                  <Input id="org-name" defaultValue="Mwangi Properties" />
                </Field>
                <Field
                  label="Contact phone"
                  htmlFor="org-phone"
                  help="Used for account alerts only."
                >
                  <Input id="org-phone" type="tel" defaultValue="0722 100 501" />
                </Field>
                <Field
                  label="SMS sender ID"
                  htmlFor="org-sender"
                  help="Shown on tenant reminders. Needs registration."
                >
                  <Input id="org-sender" defaultValue="MWANGIPROP" />
                </Field>
                <Field label="Your role" htmlFor="org-role">
                  <Select id="org-role" defaultValue="owner">
                    <option value="owner">Owner</option>
                    <option value="manager">Property manager</option>
                  </Select>
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                <Field label="Property name" htmlFor="p-name">
                  <Input id="p-name" defaultValue="Riverside Court" />
                </Field>
                <Field label="Area" htmlFor="p-area">
                  <Input id="p-area" defaultValue="Kilimani, Nairobi" />
                </Field>
                <Field label="Type" htmlFor="p-type">
                  <Select id="p-type" defaultValue="residential">
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </Select>
                </Field>
                <Field
                  label="Landlord"
                  htmlFor="p-landlord"
                  help="Leave empty if you own the property."
                >
                  <Select id="p-landlord" defaultValue="kamau">
                    <option value="">I am the landlord</option>
                    <option value="kamau">Joseph Kamau</option>
                  </Select>
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                <Field label="Number of units" htmlFor="u-count">
                  <Input id="u-count" type="number" min={1} defaultValue={48} />
                </Field>
                <Field label="Unit naming" htmlFor="u-naming">
                  <Select id="u-naming" defaultValue="block">
                    <option value="block">Block and number, e.g. A-01</option>
                    <option value="floor">Floor and number, e.g. 3-04</option>
                  </Select>
                </Field>
                <Field label="Default monthly rent (KES)" htmlFor="u-rent">
                  <Input id="u-rent" inputMode="numeric" defaultValue="12,000" />
                </Field>
                <Field label="Service charge (KES)" htmlFor="u-service">
                  <Input id="u-service" inputMode="numeric" defaultValue="1,300" />
                </Field>
              </div>
            ) : null}

            {step === 3 ? (
              <>
                <fieldset className="m-0 flex flex-wrap gap-3 border-0 p-0">
                  <legend className="mb-2.5 text-sm font-bold">How do tenants pay you?</legend>
                  {(
                    [
                      ['paybill', 'Paybill', 'Tenants enter an account number (best for matching)'],
                      ['till', 'Buy Goods till', 'Matched by phone number and amount'],
                    ] as const
                  ).map(([value, title, text]) => (
                    <label
                      key={value}
                      className={cn(
                        'flex min-w-[200px] flex-[1_1_200px] cursor-pointer items-start gap-3 rounded-xl px-4 py-3.5',
                        kind === value
                          ? 'border-2 border-brand bg-brand-tint'
                          : 'border border-border-strong',
                      )}
                    >
                      <input
                        type="radio"
                        name="kind"
                        checked={kind === value}
                        onChange={() => setKind(value)}
                        className="mt-0.5 size-5 accent-brand"
                      />
                      <span>
                        <strong className="block text-[15px]">{title}</strong>
                        <span className="text-[13px] text-muted">{text}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                  <Field
                    label={kind === 'paybill' ? 'Paybill number' : 'Till number'}
                    htmlFor="mp-number"
                    help="The business number tenants pay to."
                  >
                    <Input
                      id="mp-number"
                      placeholder="e.g. 4123456"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </Field>
                  <Field
                    label="Daraja consumer key"
                    htmlFor="mp-key"
                    help="From your Safaricom Daraja app."
                  >
                    <Input id="mp-key" type="password" autoComplete="off" />
                  </Field>
                  <Field
                    label="Daraja consumer secret"
                    htmlFor="mp-secret"
                    help="Stored encrypted. Never shown again."
                  >
                    <Input id="mp-secret" type="password" autoComplete="off" />
                  </Field>
                  <Field
                    label="Lipa na M-Pesa passkey"
                    htmlFor="mp-pass"
                    help={'Needed for “Pay now” prompts on tenants’ phones.'}
                  >
                    <Input id="mp-pass" type="password" autoComplete="off" />
                  </Field>
                </div>

                <Field label="Account number tenants should use" htmlFor="mp-account">
                  <Select id="mp-account" defaultValue="unit">
                    <option value="unit">Unit code, e.g. B-12 (recommended)</option>
                    <option value="phone">Tenant phone number</option>
                    <option value="id">Tenant ID from Kodibox</option>
                  </Select>
                </Field>

                <div role="status" aria-live="polite">
                  {conn === 'ok' ? (
                    <div className="flex items-start gap-3 rounded-xl bg-ok-soft px-4 py-3.5 text-sm">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#1C6B44"
                        strokeWidth="2.4"
                        aria-hidden="true"
                        className="mt-px flex-none"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                      <span>
                        <strong>Connection works (demo).</strong> Payment confirmations for paybill
                        [PAYBILL] will arrive in Kodibox. Last checked just now.
                      </span>
                    </div>
                  ) : conn === 'testing' ? (
                    <div className="rounded-xl bg-info-soft px-4 py-3.5 text-sm text-info">
                      Testing connection&hellip;
                    </div>
                  ) : (
                    <div className="rounded-xl bg-soft px-4 py-3.5 text-sm text-muted">
                      Not tested yet. No real call is made in the prototype.
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border-strong bg-soft p-6">
                  <p className="m-0 text-sm text-muted">
                    Upload a CSV or Excel file with unit, name, phone and rent. We only keep what
                    billing needs.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <Button variant="secondary" onClick={() => setImported(true)}>
                      Use sample file
                    </Button>
                    <Button variant="ghost" onClick={() => setImported(false)}>
                      Clear
                    </Button>
                  </div>
                </div>
                {imported ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold">
                      Preview: 4 of 142 rows <Badge tone="ok">No errors</Badge>
                    </p>
                    <Table minWidth={420}>
                      <THead>
                        <TR>
                          <TH>Unit</TH>
                          <TH>Name</TH>
                          <TH>Phone</TH>
                          <TH align="right">Rent (KES)</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {SAMPLE_ROWS.map((r) => (
                          <TR key={r[0]}>
                            <TD>{r[0]}</TD>
                            <TD>{r[1]}</TD>
                            <TD className="font-mono">{r[2]}</TD>
                            <TD align="right" className="font-mono">
                              {r[3]}
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                ) : null}
              </>
            ) : null}

            {step === 5 ? (
              <Card className="flex flex-col gap-2 bg-soft">
                <strong>November 2026 invoices</strong>
                <span className="text-sm text-muted">
                  142 tenants &middot; rent, service charge and water lines &middot; due 5 Nov
                </span>
                <span className="text-sm text-muted">
                  Tenants with SMS opt-out are skipped for reminders.
                </span>
              </Card>
            ) : null}

            <div className="flex flex-wrap justify-between gap-3 border-t border-divider pt-5">
              <Button
                variant="secondary"
                className="border-border-strong text-text"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              <div className="flex flex-wrap gap-2.5">
                {step === 3 ? (
                  <Button
                    variant="secondary"
                    onClick={testConnection}
                    disabled={conn === 'testing'}
                  >
                    {conn === 'ok' ? 'Test connection again' : 'Test connection'}
                  </Button>
                ) : null}
                <Button
                  size="lg"
                  onClick={() => (last ? router.push('/dashboard') : setStep((s) => s + 1))}
                >
                  {last
                    ? 'Run invoices and finish'
                    : step === 3
                      ? 'Continue to import tenants'
                      : 'Continue'}
                </Button>
              </div>
            </div>
          </section>

          <aside className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
            <div className="flex flex-col gap-2.5 rounded-panel bg-brand p-[22px] text-white">
              <h2 className="m-0 text-lg font-extrabold">We never hold your money</h2>
              <p className="m-0 text-sm leading-relaxed text-on-brand">
                Rent goes from your tenant straight to your paybill. Kodibox only reads
                confirmations so it can reconcile. We cannot move, withdraw or delay your funds.
              </p>
              <p className="m-0 text-sm leading-relaxed text-on-brand">
                Your Daraja keys are encrypted, never shown again after saving, and only used to
                read payment confirmations.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-[22px]">
              <h2 className="m-0 text-base font-bold">What your tenants will receive</h2>
              <div className="rounded-[14px_14px_14px_4px] bg-[#f2f1ec] p-3.5 text-sm leading-normal">
                Hi Peter, your November rent for B-12 Riverside Court is KES 16,700, due 5 Nov. Pay
                via M-Pesa Paybill [PAYBILL], Account B-12. Statement:
                kodi.bx/s/&bull;&bull;&bull;&bull; Reply STOP to opt out of reminders.
              </div>
              <p className="m-0 text-xs text-muted">
                Sent from sender ID MWANGIPROP. Receipts are sent automatically after each payment.
              </p>
            </div>
            <div className="rounded-panel border border-border bg-surface p-[22px] text-sm leading-relaxed">
              <h2 className="m-0 mb-1.5 text-base font-bold">Don&rsquo;t have Daraja keys yet?</h2>
              Our guide walks you through getting them from Safaricom, usually within 2&ndash;5
              working days. You can import tenants and send invoices while you wait.{' '}
              <a href="#guide" className="font-semibold">
                Read the guide
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const TITLES = [
  'Your organization',
  'Add your first property',
  'Set up units',
  'Connect your M-Pesa paybill',
  'Import tenants',
  'Send first invoices',
];
const INTROS = [
  'Tell us who is managing the properties. You can change this later in settings.',
  'Start with one property. You can add more, and assign a landlord, at any time.',
  'Create all units at once. Rents can be adjusted per unit afterwards.',
  'Tenants keep paying to your own paybill or till. Kodibox reads each payment confirmation from Safaricom and matches it to the right unit automatically.',
  'Bring your existing tenant list. Phone numbers and IDs are encrypted and masked in the app.',
  'Review and run your first billing. Nothing is sent to tenants until you confirm.',
];
