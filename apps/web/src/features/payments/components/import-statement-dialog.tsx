'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { SAMPLE_MPESA_STATEMENT_CSV } from '@kodibox/demo';
import { Badge, Button, Dialog, Field, Input, Money, Select, useToast } from '@/components/ui';
import type { DemoData } from '@/demo';
import {
  REASON_LABEL,
  UNMATCHED_REASON_LABEL,
  parseStatement,
  previewImport,
  sniffBankHeaders,
  type ImportPreview,
  type SourceKind,
} from '@/demo/recon';
import {
  BANK_DATE_FORMATS,
  MAX_FILE_BYTES,
  type BankCsvMapping,
  type ParseOutput,
} from '../reconcile-adapter';

const SAMPLE_BANK_CSV = [
  'Posting Date,Narrative,Credit,Debit,Bank Ref,Customer Ref',
  '05/11/2026,TRANSFER FROM SAMPLE PAYER,"16,700.00",,FT26309AB12,B-12',
  '05/11/2026,CHEQUE DEPOSIT,"9,000.00",,FT26309AB13,',
  '05/11/2026,BANK CHARGES,,35.00,FT26309AB14,',
].join('\n');

/** Saved per session in this prototype; the product stores one template per org and account. */
let savedTemplate: BankCsvMapping | null = null;

type Step = 'source' | 'mapping' | 'preview';

interface Props {
  open: boolean;
  onClose: () => void;
  data: DemoData;
  onConfirm: (preview: ImportPreview) => void;
}

export function ImportStatementDialog({ open, onClose, data, onConfirm }: Props) {
  const { toast } = useToast();
  const [kind, setKind] = useState<SourceKind>('mpesa');
  const [step, setStep] = useState<Step>('source');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [map, setMap] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [saveTemplate, setSaveTemplate] = useState(true);
  const [ack, setAck] = useState(false);

  const headers = useMemo(
    () => (kind === 'bank' && text ? sniffBankHeaders(text) : []),
    [kind, text],
  );

  const reset = () => {
    setStep('source');
    setText('');
    setFileName('');
    setError('');
    setPreview(null);
    setAck(false);
    setMap({});
  };
  const close = () => {
    reset();
    onClose();
  };

  function build(parsed: ParseOutput, name: string) {
    setPreview(previewImport(data, parsed, { kind, fileName: name }));
    setStep('preview');
    setError('');
  }

  function runMpesa(csv: string, name: string) {
    const r = parseStatement('mpesa', csv);
    if (!r.ok) return setError(r.message);
    build(r.value, name);
  }

  function runBank(mapping: BankCsvMapping, csv = text, name = fileName) {
    const r = parseStatement('bank', csv, mapping);
    if (!r.ok) return setError(r.message);
    build(r.value, name);
  }

  function afterLoad(csv: string, name: string) {
    setText(csv);
    setFileName(name);
    setError('');
    if (kind === 'mpesa') return runMpesa(csv, name);
    const hs = sniffBankHeaders(csv);
    const t = savedTemplate;
    if (t && [t.date, t.reference].every((h) => hs.includes(h))) {
      toast('Using your saved column template for this account.', 'info');
      return runBank(t, csv, name);
    }
    setMap({
      date: hs.find((h) => /date/i.test(h)) ?? '',
      amount: hs.find((h) => /credit|amount/i.test(h)) ?? '',
      reference: hs.find((h) => /ref/i.test(h)) ?? '',
      description: hs.find((h) => /narr|desc/i.test(h)) ?? '',
      accountRef: hs.find((h) => /customer|account/i.test(h)) ?? '',
    });
    setStep('mapping');
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_FILE_BYTES)
      return setError('That file is larger than 5 MB. Export a shorter period.');
    if (/\.xlsx?$/i.test(f.name)) {
      return setError(
        'Excel files are read on the server in the full product. In this prototype, save the sheet as CSV and upload that.',
      );
    }
    afterLoad(await f.text(), f.name);
  }

  const mapped = (): BankCsvMapping => ({
    date: map.date ?? '',
    credit: map.amount ?? '',
    reference: map.reference ?? '',
    ...(map.description ? { description: map.description } : {}),
    ...(map.accountRef ? { accountRef: map.accountRef } : {}),
    dateFormat: dateFormat as BankCsvMapping['dateFormat'],
  });
  const mappingOk = !!(map.date && map.amount && map.reference);

  const c = preview?.counts;
  const tenantName = (id: string) => data.tenants.find((t) => t.id === id)?.name ?? id;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Import statement"
      description="Upload the statement you downloaded from M-Pesa or your bank. Kodibox reads it and matches lines to tenants. It never connects to your account."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          {step === 'mapping' ? (
            <Button
              disabled={!mappingOk}
              onClick={() => {
                if (saveTemplate) savedTemplate = mapped();
                runBank(mapped());
              }}
            >
              Preview import
            </Button>
          ) : null}
          {step === 'preview' && preview ? (
            <Button
              disabled={
                preview.counts.fresh +
                  preview.counts.conflicts +
                  preview.counts.possibleDuplicates ===
                  0 ||
                (preview.counts.alerts > 0 && !ack)
              }
              onClick={() => {
                onConfirm(preview);
                toast(
                  `Imported ${preview.counts.autoMatched} matched, ${preview.counts.needsReview} to review.`,
                  'ok',
                );
                close();
              }}
            >
              Confirm import
            </Button>
          ) : null}
        </>
      }
    >
      {step === 'source' ? (
        <div className="flex flex-col gap-4">
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 p-0 text-sm font-bold">Payment source</legend>
            {(
              [
                ['mpesa', 'M-Pesa paybill or till', 'Business portal statement (CSV)'],
                ['bank', 'Bank account', 'Any bank CSV; you map the columns once'],
              ] as const
            ).map(([id, label, hint]) => (
              <label
                key={id}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-3"
              >
                <input
                  type="radio"
                  name="src"
                  className="mt-1 size-5 accent-brand"
                  checked={kind === id}
                  onChange={() => setKind(id)}
                />
                <span className="flex flex-col">
                  <strong>{label}</strong>
                  <span className="text-sm text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Field label="Statement file (CSV or XLSX)" htmlFor="stmt-file" error={error}>
            <Input id="stmt-file" type="file" accept=".csv,.xlsx,text/csv" onChange={onFile} />
          </Field>
          <div>
            <Button
              variant="secondary"
              onClick={() =>
                kind === 'mpesa'
                  ? (setFileName('sample-mpesa-statement.csv'),
                    setText(SAMPLE_MPESA_STATEMENT_CSV),
                    runMpesa(SAMPLE_MPESA_STATEMENT_CSV, 'sample-mpesa-statement.csv'))
                  : afterLoad(SAMPLE_BANK_CSV, 'sample-bank-statement.csv')
              }
            >
              {kind === 'mpesa' ? 'Use sample M-Pesa statement' : 'Use sample bank statement'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'mapping' ? (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-muted">
            Tell Kodibox which column holds what. This is saved as a template for next time.
          </p>
          {error ? (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {(
            [
              ['date', 'Date column'],
              ['amount', 'Amount (credit) column'],
              ['reference', 'Bank reference column'],
              ['description', 'Description column (optional)'],
              ['accountRef', 'Account reference column (optional)'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} htmlFor={`map-${key}`}>
              <Select
                id={`map-${key}`}
                value={map[key] ?? ''}
                onChange={(e) => setMap((m) => ({ ...m, [key]: e.target.value }))}
              >
                <option value="">Not used</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
          <Field label="Date format" htmlFor="map-format">
            <Select
              id="map-format"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              {BANK_DATE_FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </Field>
          <label className="flex min-h-11 items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-brand"
              checked={saveTemplate}
              onChange={(e) => setSaveTemplate(e.target.checked)}
            />
            Save this mapping as a template
          </label>
        </div>
      ) : null}

      {step === 'preview' && preview && c ? (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm text-muted">
            {preview.fileName} · {preview.sourceLabel}. Nothing is posted until you confirm.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              [
                ['New lines', c.fresh],
                ['Duplicates skipped', c.duplicates],
                ['Auto-matched', c.autoMatched],
                ['Needs review', c.needsReview],
                ['Claims verified', c.claimsVerified],
                ['Code found, needs review', preview.reviewClaimIds.length],
                ['Claims contradicted', preview.flagClaimIds.length],
                ['Row errors', c.rowErrors],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="rounded-card border border-border bg-surface p-3">
                <div className="text-2xl font-extrabold">{n}</div>
                <div className="text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>
          {c.alerts > 0 ? (
            <div
              role="alert"
              className="rounded-card border border-danger bg-danger-soft p-3 text-sm text-danger"
            >
              <strong>Check these before importing.</strong> {c.alerts} line(s) reuse the code of an
              already verified payment but with different details. This can mean a mistake in the
              file or tampering. They go to the review queue and are logged.
              <label className="mt-2 flex min-h-11 items-center gap-2.5 font-semibold">
                <input
                  type="checkbox"
                  className="size-5 accent-brand"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                I understand and want to continue
              </label>
            </div>
          ) : null}
          {preview.result.conflicts.length > 0 ? (
            <section aria-label="Conflicts">
              <h3 className="m-0 mb-2 text-sm font-bold">Conflict, review</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                {preview.result.conflicts
                  .filter((x) => x.kind !== 'claim_conflict')
                  .map((x) => (
                    <li
                      key={x.record.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-warn bg-surface p-3"
                    >
                      <span>
                        <span className="font-mono text-xs">{x.record.externalRef}</span>
                        <br />
                        <span className="text-muted">
                          Same code, different {x.fields.join('/')}: review. Needs review.
                        </span>
                      </span>
                      <Money minor={Number(x.record.amount)} className="font-bold" />
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
          {preview.result.possibleDuplicates.length > 0 ? (
            <section aria-label="Possible duplicates">
              <h3 className="m-0 mb-2 text-sm font-bold">Possible duplicates</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                {preview.result.possibleDuplicates.map((x) => (
                  <li
                    key={x.record.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface p-3"
                  >
                    <span className="text-muted">
                      Line {x.ordinal} looks identical to an earlier line without a reference.
                    </span>
                    <Money minor={Number(x.record.amount)} className="font-bold" />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {preview.result.matched.length > 0 ? (
            <section aria-label="Auto-matched lines">
              <h3 className="m-0 mb-2 text-sm font-bold">Auto-matched</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {preview.result.matched.map((m) => (
                  <li
                    key={m.record.id}
                    className="flex flex-col gap-1 rounded-card border border-border bg-surface p-3 text-sm"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <strong>
                        {m.target.unitCode} · {tenantName(m.target.tenantId)}
                      </strong>
                      <Money minor={Number(m.record.amount)} className="font-bold" />
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs text-muted">{m.record.externalRef}</span>
                      <Badge tone="ok">{Math.round(m.match.confidence * 100)}% confidence</Badge>
                      {m.match.reasons.map((r) => (
                        <Badge key={r}>{REASON_LABEL[r] ?? r}</Badge>
                      ))}
                      {m.credit > 0n ? (
                        <Badge tone="info">
                          Credit <Money minor={Number(m.credit)} prefix={false} />
                        </Badge>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {preview.result.unmatched.length > 0 ? (
            <section aria-label="Lines needing review">
              <h3 className="m-0 mb-2 text-sm font-bold">Needs review</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {preview.result.unmatched.map((u) => (
                  <li
                    key={u.record.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface p-3 text-sm"
                  >
                    <span className="flex flex-col">
                      <span className="font-mono text-xs">
                        {u.record.externalRef ?? 'no reference'}
                      </span>
                      <span className="text-muted">
                        Account “{u.record.accountRef ?? '(blank)'}”
                        {preview.maskedPhones[u.record.id]
                          ? ` · ${preview.maskedPhones[u.record.id]}`
                          : ''}
                      </span>
                    </span>
                    <Badge tone="warn">
                      {(UNMATCHED_REASON_LABEL as Record<string, string>)[u.reason]?.split(
                        ':',
                      )[0] ?? 'Needs review'}
                    </Badge>
                    <Money minor={Number(u.record.amount)} className="font-bold" />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {preview.rowErrors.length > 0 ? (
            <section aria-label="Row errors">
              <h3 className="m-0 mb-2 text-sm font-bold">Row errors (skipped)</h3>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-danger">
                {preview.rowErrors.map((r) => (
                  <li key={`${r.row}-${r.code}`}>
                    Row {r.row}: {r.message || r.code}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {c.fresh === 0 ? (
            <p className="m-0 text-sm text-muted">
              Nothing new: every line was already imported, so confirming would change nothing.
            </p>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
