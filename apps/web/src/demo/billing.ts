/**
 * Billing helpers for the Payments and Invoices screens (P-02). Reuse the seed data; add no data.
 */
import { listInvoices, listMeterReadings, seedData } from './index';
import type { DemoData, Invoice, InvoiceLine, UnmatchedPayment } from './types';

export type InvoiceDisplayStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';

export const INVOICE_STATUS_LABEL: Record<InvoiceDisplayStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};

export const INVOICE_STATUS_TONE: Record<
  InvoiceDisplayStatus,
  'ok' | 'warn' | 'danger' | 'info' | 'neutral'
> = {
  draft: 'neutral',
  sent: 'info',
  partial: 'warn',
  paid: 'ok',
  overdue: 'danger',
  void: 'neutral',
};

/** Seed statuses are paid/partial/unpaid/overdue; "unpaid" is shown as "Sent". Voids live in UI state. */
export function displayStatus(inv: Pick<Invoice, 'status' | 'id'>, voided: ReadonlySet<string>) {
  if (voided.has(inv.id)) return 'void' as const;
  if (inv.status === 'unpaid') return 'sent' as const;
  return inv.status;
}

export interface AllocationLine {
  label: string;
  applied: number;
  of: number;
}

/** Oldest charges first, late fees (penalties) last. Returns lines plus remaining balance and any credit. */
export function previewAllocation(
  invoice: Pick<Invoice, 'lines' | 'number' | 'balance' | 'paid'>,
  amount: number,
): { lines: AllocationLine[]; remaining: number; credit: number } {
  // Open charges: scale lines by what is already paid (oldest first).
  let alreadyPaid = invoice.paid;
  const open: { line: InvoiceLine; of: number }[] = [];
  const ordered = [
    ...invoice.lines.filter((l) => l.kind !== 'late_fee'),
    ...invoice.lines.filter((l) => l.kind === 'late_fee'),
  ];
  for (const line of ordered) {
    const covered = Math.min(line.amount, alreadyPaid);
    alreadyPaid -= covered;
    open.push({ line, of: line.amount - covered });
  }
  let left = amount;
  const lines = open
    .filter((o) => o.of > 0)
    .map(({ line, of }) => {
      const applied = Math.min(of, left);
      left -= applied;
      return { label: `${invoice.number} · ${line.label}`, applied, of };
    });
  return {
    lines,
    remaining: Math.max(0, invoice.balance - amount),
    credit: Math.max(0, amount - invoice.balance),
  };
}

/** "John Kamau" becomes "JOHN K•••" (payer names on M-Pesa are already limited to initials in the UI). */
export function maskPayerName(name: string): string {
  // Payer names sometimes arrive as phone numbers: never show a digit run of 7 or more.
  const safe = name.replace(/\+?\d[\d\s-]{5,}\d/g, '').replace(/\d{7,}/g, '');
  const [first = '', second] = safe.trim().split(/\s+/);
  if (!first) return '•••';
  return `${first.toUpperCase()} ${second ? second[0]?.toUpperCase() : ''}•••`.replace('  ', ' ');
}

export function suggestionConfidence(s: UnmatchedPayment['suggestions'][number]): {
  label: string;
  strong: boolean;
} {
  if (/looks like|matches unit/i.test(s.reason)) return { label: 'Strong match', strong: true };
  if (/amount matches/i.test(s.reason)) return { label: 'Likely', strong: false };
  return { label: 'Possible', strong: false };
}

export interface RunSummary {
  activeLeases: number;
  units: number;
  vacant: number;
  toCreate: number;
  total: number;
  skipped: { id: string; unit: string; propertyName: string }[];
}

export function getInvoiceRunSummary(period = '2026-11', src: DemoData = seedData): RunSummary {
  const activeLeases = src.leases.filter((l) => l.status !== 'ended').length;
  const missing = listMeterReadings(undefined, src).filter((m) => m.status === 'pending');
  const skipped = missing.map((m) => {
    const unit = src.units.find((u) => u.id === m.unitId);
    const prop = src.properties.find((p) => p.id === m.propertyId);
    return { id: m.id, unit: unit?.code ?? m.unitId, propertyName: prop?.name ?? '' };
  });
  const total = src.invoices.filter((i) => i.period === period).reduce((s, i) => s + i.total, 0);
  return {
    activeLeases,
    units: src.units.length,
    vacant: src.units.filter((u) => u.status === 'vacant').length,
    toCreate: Math.max(0, activeLeases - skipped.length),
    total,
    skipped,
  };
}

export function listPreviewInvoices(count = 5, period = '2026-11', src: DemoData = seedData) {
  return listInvoices({}, src)
    .filter((i) => i.period === period)
    .slice(0, count);
}
