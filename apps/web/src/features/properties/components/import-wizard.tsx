'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  LinkButton,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { IMPORT_ROWS } from '@/demo/properties-tenants';

const STEPS = ['Upload', 'Map columns', 'Review', 'Import'] as const;
const SOURCE_COLUMNS = [
  'Full Name',
  'Mobile',
  'Apt No.',
  'Monthly Rent',
  'Security Deposit',
  'Start Date',
  'National ID',
];
const FIELDS: { key: string; label: string; required: boolean; initial: string }[] = [
  { key: 'name', label: 'Name', required: true, initial: 'Full Name' },
  { key: 'phone', label: 'Phone', required: true, initial: 'Mobile' },
  { key: 'unit', label: 'Unit', required: true, initial: 'Apt No.' },
  { key: 'rent', label: 'Rent (KES)', required: true, initial: 'Monthly Rent' },
  { key: 'deposit', label: 'Deposit (KES)', required: false, initial: 'Security Deposit' },
  { key: 'start', label: 'Lease start', required: true, initial: 'Start Date' },
  { key: 'id', label: 'ID number', required: false, initial: 'National ID' },
];
const SKIP = 'Do not import';
const TONE = { ok: 'ok', warn: 'warn', error: 'danger' } as const;
const LABEL = { ok: 'OK', warn: 'Warning', error: 'Error' } as const;

export function ImportWizard() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, f.initial])),
  );
  const [consent, setConsent] = useState(false);

  const missing = FIELDS.filter((f) => f.required && mapping[f.key] === SKIP);
  const mappedCols = FIELDS.map((f) => mapping[f.key]).filter((c) => c !== SKIP);
  const dupes = mappedCols.length !== new Set(mappedCols).size;
  const mapError = missing.length
    ? `Map the required column${missing.length > 1 ? 's' : ''}: ${missing.map((m) => m.label).join(', ')}.`
    : dupes
      ? 'Each source column can be mapped to one field only.'
      : '';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Tenants & leases / Import"
        title="Import tenants"
        actions={
          <Button
            variant="secondary"
            onClick={() => toast('Blank template downloaded (demo).', 'info')}
          >
            Download blank template (CSV)
          </Button>
        }
      />

      <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Import steps">
        {STEPS.map((label, i) => {
          const cur = i === step;
          const done = i < step;
          return (
            <li
              key={label}
              aria-current={cur ? 'step' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-full border py-0 pr-3.5 pl-2 text-sm',
                cur ? 'border-brand bg-brand font-bold text-white' : 'border-border bg-surface',
              )}
            >
              <span
                className={cn(
                  'flex size-[26px] items-center justify-center rounded-full text-[13px] font-extrabold text-text',
                  cur ? 'bg-amber' : done ? 'bg-ok-soft text-ok' : 'bg-divider',
                )}
              >
                {done ? '✓' : i + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      {step === 0 ? (
        <Card>
          <CardHeader title="Upload your file" />
          <p className="mt-0 text-sm text-muted">
            CSV or Excel. We read the first sheet. Nothing is imported until you confirm on the last
            step.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Tenant file" htmlFor="imp-file" className="min-w-64 flex-1">
              <input
                id="imp-file"
                type="file"
                accept=".csv,.xlsx"
                className="min-h-11 rounded-control border border-border-strong bg-surface p-2 text-sm"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              />
            </Field>
            <Button
              variant="secondary"
              onClick={() => {
                setFileName('tenants_export_oct2026.xlsx');
                toast('Sample file loaded.', 'info');
              }}
            >
              Use sample file
            </Button>
          </div>
          {fileName ? (
            <div className="mt-4 rounded-card bg-soft p-3 text-sm">
              <strong>{fileName}</strong>
              <br />
              <span className="text-muted">
                Sheet &quot;Active tenants&quot; · 137 data rows · exported from another system
              </span>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!fileName}>
              Continue to mapping
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader title="Map columns" />
          <p className="mt-0 text-sm text-muted">
            We matched your headers automatically. Check each one. Required fields are marked *.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f) => (
              <Field
                key={f.key}
                label={`${f.label}${f.required ? ' *' : ''}`}
                htmlFor={`map-${f.key}`}
              >
                <Select
                  id={`map-${f.key}`}
                  value={mapping[f.key]}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                >
                  {SOURCE_COLUMNS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                  <option>{SKIP}</option>
                </Select>
              </Field>
            ))}
          </div>
          <p className="mb-0 text-xs text-muted">
            ID numbers are stored encrypted and shown masked (••••4821). Leave unmapped if you do
            not need them.
          </p>
          {mapError ? (
            <p role="alert" className="mt-3 mb-0 text-sm font-semibold text-danger">
              {mapError}
            </p>
          ) : null}
          <div className="mt-4 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back to upload
            </Button>
            <Button
              onClick={() => (mapError ? toast(mapError, 'danger') : setStep(2))}
              aria-disabled={Boolean(mapError)}
            >
              Validate and review
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader title="Review · first rows with issues" />
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="ok">128 ready</Badge>
            <Badge tone="warn">6 warnings</Badge>
            <Badge tone="danger">3 errors</Badge>
          </div>
          <Table minWidth={820}>
            <THead>
              <TR>
                <TH>Row</TH>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Unit</TH>
                <TH align="right">Rent</TH>
                <TH align="right">Deposit</TH>
                <TH>Lease start</TH>
                <TH>Check</TH>
              </TR>
            </THead>
            <TBody>
              {IMPORT_ROWS.map((r) => (
                <TR
                  key={r.row}
                  className={
                    r.kind === 'warn'
                      ? 'bg-warn-soft/40'
                      : r.kind === 'error'
                        ? 'bg-danger-soft/40'
                        : ''
                  }
                >
                  <TD>{r.row}</TD>
                  <TD className="font-semibold">{r.name}</TD>
                  <TD className="font-mono">{r.phone}</TD>
                  <TD className={cn('font-semibold', r.kind === 'error' && 'text-danger')}>
                    {r.unit}
                  </TD>
                  <TD align="right" className="font-mono">
                    {r.rent}
                  </TD>
                  <TD align="right" className="font-mono">
                    {r.deposit}
                  </TD>
                  <TD>{r.start}</TD>
                  <TD>
                    <Badge tone={TONE[r.kind]}>{LABEL[r.kind]}</Badge>
                    <div className="mt-1 text-xs text-muted">{r.detail}</div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="mt-3 mb-1 text-sm">
            6 warnings are fixed automatically (phone numbers converted to +254 format, dates read
            as DD/MM/YYYY). You can review them in the log after import.
          </p>
          <p className="m-0 text-sm">
            3 errors will be skipped. Download the error rows, fix them and import again. Nothing is
            half-imported.
          </p>
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back to mapping
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => toast('3 error rows downloaded (demo).', 'info')}
              >
                Download 3 error rows
              </Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <ImportConfirm
          consent={consent}
          setConsent={setConsent}
          onBack={() => setStep(2)}
          onImport={() => {
            setStep(4);
            toast('Import queued: 134 tenants.', 'ok');
          }}
        />
      ) : null}

      {step === 4 ? (
        <Card>
          <div role="status" className="flex flex-col gap-3">
            <h2 className="m-0 text-xl font-extrabold text-ok">Import complete</h2>
            <p className="m-0 text-sm">
              128 ready + 6 fixed = <strong>134 tenants imported</strong>. 3 rows were skipped. The
              import is logged and can be undone for 24 hours. Each tenant gets a welcome SMS with a
              privacy link and an opt-out.
            </p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/tenants">View tenants</LinkButton>
              <LinkButton href="/properties" variant="secondary">
                Back to properties
              </LinkButton>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function ImportConfirm({
  consent,
  setConsent,
  onBack,
  onImport,
}: {
  consent: boolean;
  setConsent: (v: boolean) => void;
  onBack: () => void;
  onImport: () => void;
}) {
  return (
    <Card>
      <CardHeader title="Confirm and import" />
      <p className="mt-0 text-sm">
        128 ready + 6 fixed automatically = <strong>134 tenants</strong> will be imported. 3 error
        rows are skipped.
      </p>
      <Checkbox
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
        label={
          <span>
            I confirm these tenants were informed per our privacy notice. Under the Data Protection
            Act, 2019 you are responsible for telling tenants what data you hold and why. Kodibox
            will send each tenant a welcome SMS with a privacy link and an opt-out.
          </span>
        }
      />
      <div className="mt-4 flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back to review
        </Button>
        <Button onClick={onImport} disabled={!consent}>
          Import 134 tenants
        </Button>
      </div>
    </Card>
  );
}
