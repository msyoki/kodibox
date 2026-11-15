'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Avatar,
  Button,
  Checkbox,
  Dialog,
  MaskedText,
  Switch,
  Textarea,
  useToast,
} from '@/components/ui';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Eyebrow } from '@/components/tenant-app/bits';
import { cn } from '@/lib/cn';
import { DEMO_TENANT_ID } from '@/demo';
import { useDemoStore } from '@/demo/store';
import { LANDLORD_NAME, PROPERTY_LABEL } from '@/demo/tenant-app';

const row =
  'flex min-h-[52px] items-center justify-between gap-3 border-t border-divider first:border-t-0';

export default function TenantProfilePage() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const router = useRouter();
  const tenant = data.tenants.find((t) => t.id === DEMO_TENANT_ID);

  const [sms, setSms] = useState(!tenant?.smsOptOut);
  const [push, setPush] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [fingerprint, setFingerprint] = useState(true);
  const [devices, setDevices] = useState([
    { id: 'd1', name: 'This phone (Android)', current: true },
    { id: 'd2', name: 'Tecno Spark (last seen 28 Oct)', current: false },
  ]);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correction, setCorrection] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <Avatar name="Peter Otieno" size="lg" className="size-14 bg-brand text-xl text-white" />
        <div>
          <h1 className="m-0 text-xl font-extrabold">Peter Otieno</h1>
          <Eyebrow>{PROPERTY_LABEL}</Eyebrow>
          {tenant ? (
            <MaskedText kind="phone" value={tenant.phone} className="text-sm text-muted" />
          ) : null}
        </div>
      </header>

      <section aria-labelledby="nf">
        <h2 id="nf" className="mb-2 mt-0 text-sm font-extrabold">
          Notifications
        </h2>
        <div className="rounded-card border border-border bg-surface px-4">
          <div className={row}>
            <Switch
              label="Rent reminders by SMS"
              checked={sms}
              onChange={(e) => {
                setSms(e.target.checked);
                toast(e.target.checked ? 'SMS reminders on' : 'SMS reminders off', 'info');
              }}
              className="w-full justify-between flex-row-reverse"
            />
          </div>
          <div className={row}>
            <Switch
              label="Rent reminders by push"
              checked={push}
              onChange={(e) => setPush(e.target.checked)}
              className="w-full justify-between flex-row-reverse"
            />
          </div>
          <div className={row}>
            <Switch
              label="Marketing and offers"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="w-full justify-between flex-row-reverse"
            />
          </div>
        </div>
        <p className="mt-2 mb-0 text-xs text-muted">
          You can also reply STOP to any Kodibox SMS to opt out of reminders. Receipts and legal
          notices are always sent.
        </p>
      </section>

      <section aria-labelledby="ap">
        <h2 id="ap" className="mb-2 mt-0 text-sm font-extrabold">
          Appearance
        </h2>
        <ThemeToggle variant="segmented" />
      </section>

      <section aria-labelledby="lg">
        <h2 id="lg" className="mb-2 mt-0 text-sm font-extrabold">
          Language
        </h2>
        <div role="group" aria-labelledby="lg" className="grid grid-cols-2 gap-2">
          {(
            [
              ['en', 'English'],
              ['sw', 'Kiswahili'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={lang === key}
              onClick={() => {
                setLang(key);
                toast(`Language set to ${label}`, 'info');
              }}
              className={cn(
                'min-h-11 rounded-control border text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link',
                lang === key
                  ? 'border-brand bg-brand-soft text-link'
                  : 'border-border-strong bg-surface text-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="sc">
        <h2 id="sc" className="mb-2 mt-0 text-sm font-extrabold">
          Security
        </h2>
        <div className="rounded-card border border-border bg-surface px-4">
          <div className={row}>
            <Switch
              label="Fingerprint lock"
              checked={fingerprint}
              onChange={(e) => setFingerprint(e.target.checked)}
              className="w-full justify-between flex-row-reverse"
            />
          </div>
          <button
            type="button"
            onClick={() => setDevicesOpen(true)}
            className={cn(row, 'w-full text-left text-sm')}
          >
            <span>Signed-in devices</span>
            <span className="text-muted">{devices.length} devices</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="pv">
        <h2 id="pv" className="mb-2 mt-0 text-sm font-extrabold">
          Privacy
        </h2>
        <div className="rounded-card border border-border bg-surface px-4">
          <button
            type="button"
            className={cn(row, 'w-full text-left text-sm font-semibold')}
            onClick={() => toast('Data export requested. We will send it within 30 days.', 'ok')}
          >
            Download my data
          </button>
          <button
            type="button"
            className={cn(row, 'w-full text-left text-sm font-semibold')}
            onClick={() => setCorrectionOpen(true)}
          >
            Request a correction
          </button>
          <button
            type="button"
            className={cn(row, 'w-full text-left text-sm font-semibold text-danger')}
            onClick={() => setDeleteOpen(true)}
          >
            Delete my account
          </button>
        </div>
        <p className="mt-2 mb-0 text-xs text-muted">
          If you delete your account, your personal details are removed. Payment records are kept
          for the period the law requires.
        </p>
      </section>

      <div className="rounded-card border border-border bg-surface px-4">
        <button
          type="button"
          className={cn(row, 'w-full text-left text-sm')}
          onClick={() => toast(`Opening a chat with ${LANDLORD_NAME} (demo)`, 'info')}
        >
          <span>Help and contact landlord</span>
          <span className="text-muted">{LANDLORD_NAME}</span>
        </button>
      </div>

      <Link
        href="/m/login"
        className="flex min-h-12 items-center justify-center rounded-control border border-border-strong bg-surface text-[15px] font-bold text-text no-underline hover:bg-divider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      >
        Sign out
      </Link>

      <Dialog
        open={devicesOpen}
        onClose={() => setDevicesOpen(false)}
        title="Signed-in devices"
        footer={<Button onClick={() => setDevicesOpen(false)}>Done</Button>}
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{d.name}</span>
              {d.current ? (
                <span className="text-xs text-muted">Current</span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDevices((ds) => ds.filter((x) => x.id !== d.id));
                    toast('Device signed out', 'ok');
                  }}
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        title="Request a correction"
        description="Tell us what is wrong in your details. We reply within 30 days."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCorrectionOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={correction.trim().length < 3}
              onClick={() => {
                setCorrectionOpen(false);
                setCorrection('');
                toast('Correction request received', 'ok');
              }}
            >
              Send request
            </Button>
          </>
        }
      >
        <Textarea
          aria-label="What should be corrected?"
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          placeholder="For example: my name is spelled Otieno, not Otiano"
        />
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmDelete(false);
        }}
        title="Delete my account?"
        description="Your personal details will be removed. Payment records are kept for the period the law requires, so your landlord's books stay correct."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteOpen(false);
                setConfirmDelete(false);
              }}
            >
              Keep my account
            </Button>
            <Button
              variant="danger"
              disabled={!confirmDelete}
              onClick={() => {
                setDeleteOpen(false);
                toast('Deletion requested. You have been signed out.', 'warn');
                router.push('/m/login');
              }}
            >
              Delete account
            </Button>
          </>
        }
      >
        <Checkbox
          label="I understand this cannot be undone"
          checked={confirmDelete}
          onChange={(e) => setConfirmDelete(e.target.checked)}
        />
      </Dialog>
    </div>
  );
}
