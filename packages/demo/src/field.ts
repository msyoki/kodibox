/**
 * Caretaker and manager persona data for the phone views.
 * Derived from the seed where possible; the rest is small static fixtures. Money is bigint cents.
 */
import { shortDay } from './format';
import { shillings, sumMinor } from './money';
import {
  getCollection,
  listCashPayments,
  listTenants,
  listUnmatched,
  type CollectionSummary,
  type TenantRow,
} from './queries';
import type { DemoData, PaymentChannel, PaymentStatus } from './types';

export const CARETAKER_NAME = 'Otieno Ouma';
export const CARETAKER_INITIALS = 'OO';
export const MANAGER_NAME = 'Wanjiru Mwangi';
export const MANAGER_FIRST_NAME = 'Wanjiru';

// ---- caretaker --------------------------------------------------------------------------

export interface ReadingItem {
  id: string;
  unitCode: string;
  previous: number;
  current: number | null;
  ratePerUnit: bigint;
  meter: string;
}

/** Mvule water readings in unit order: the first 18 are already recorded, 6 are pending. */
export function listReadingQueue(src: DemoData): ReadingItem[] {
  return src.meterReadings
    .filter((m) => m.propertyId === 'prop_mvule')
    .map((m) => ({
      id: m.id,
      unitCode: src.units.find((u) => u.id === m.unitId)?.code ?? '?',
      previous: m.previous,
      current: m.current,
      ratePerUnit: m.ratePerUnit,
      meter: `WM-${20000 + (m.previous % 900)}`,
    }));
}

export interface CashTenantOption {
  tenantId: string;
  unitCode: string;
  label: string;
}

/** Baraka Flats tenants the caretaker can record cash for. */
export function listCashTenantOptions(src: DemoData): CashTenantOption[] {
  return src.tenants
    .filter((t) => t.propertyId === 'prop_baraka')
    .map((t) => ({
      tenantId: t.id,
      unitCode: src.units.find((u) => u.id === t.unitId)?.code ?? '',
      name: t.name,
    }))
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode, undefined, { numeric: true }))
    .map((t) => ({
      tenantId: t.tenantId,
      unitCode: t.unitCode,
      label: `${t.unitCode} · ${t.name}`,
    }));
}

export type CashStatus = Extract<PaymentStatus, 'awaiting_approval' | 'matched' | 'rejected'>;

export interface CashEntry {
  id: string;
  unitCode: string;
  tenantName: string;
  /** Receipt book number. */
  reference: string;
  amount: bigint;
  receivedAt: string;
  status: CashStatus;
  recordedBy: string;
}

/** Every cash entry in the seed, newest first. Maker (caretaker) and checker (manager) both read this. */
export function listCashEntries(src: DemoData): CashEntry[] {
  return listCashPayments(src).map((p) => ({
    id: p.id,
    unitCode: p.unitCode,
    tenantName: p.tenantName,
    reference: p.reference,
    amount: p.amount,
    receivedAt: p.receivedAt,
    status: p.status,
    recordedBy: p.recordedBy ?? 'Unknown',
  }));
}

export interface CaretakerTask {
  id: 'readings' | 'inspection' | 'jobs' | 'cash';
  mark: string;
  title: string;
  sub: string;
  badge: string;
  tone: 'ok' | 'warn' | 'info' | 'neutral';
}

export const CARETAKER_TASKS: readonly CaretakerTask[] = [
  {
    id: 'readings',
    mark: 'Rd',
    title: 'Readings due: 6 units',
    sub: 'Mvule Apartments · by 28 Nov',
    badge: 'Due',
    tone: 'warn',
  },
  {
    id: 'inspection',
    mark: 'Mo',
    title: 'Move-out inspection A-07',
    sub: 'Baraka Flats · 2:00 pm',
    badge: '2 pm',
    tone: 'info',
  },
  {
    id: 'jobs',
    mark: 'Jb',
    title: 'Fix sink B-12',
    sub: 'Riverside Court · Kitchen sink leaking',
    badge: 'In progress',
    tone: 'info',
  },
  {
    id: 'cash',
    mark: 'Ca',
    title: 'Collect cash receipts',
    sub: '2 receipts recorded',
    badge: 'Done',
    tone: 'ok',
  },
];

export interface OutboxItem {
  id: string;
  label: string;
  when: string;
}

/** What the caretaker's phone holds while offline. */
export const INITIAL_OUTBOX: readonly OutboxItem[] = [
  { id: 'ob1', label: '3 meter readings with photos', when: '8:15 am' },
  { id: 'ob2', label: 'Cash entry KES 14,000 · A-03', when: '9:05 am' },
];

export type Condition = 'Good' | 'Fair' | 'Damaged';
export interface InspectionRoom {
  name: string;
  photos: number;
  condition: Condition;
  note: string;
}

export const INSPECTION = {
  unit: 'A-07',
  property: 'Baraka Flats',
  tenantName: 'Brian Kiptoo',
  finalReading: '1,842',
  keysReturned: 2,
} as const;

export const INSPECTION_ROOMS: readonly InspectionRoom[] = [
  { name: 'Living room', photos: 3, condition: 'Good', note: 'Walls clean, floor tiles intact.' },
  { name: 'Kitchen', photos: 4, condition: 'Fair', note: 'Sink stained, cabinet hinge loose.' },
  { name: 'Bedroom', photos: 2, condition: 'Good', note: 'Repainted wall by tenant, no damage.' },
  {
    name: 'Bathroom',
    photos: 5,
    condition: 'Damaged',
    note: 'Cracked basin, shower head missing.',
  },
];

export const JOB_STEPS = ['Reported', 'Assigned', 'In progress', 'Done'] as const;

export const MAIN_JOB = {
  id: 'WO-0231',
  title: 'Kitchen sink leaking, B-12',
  property: 'Riverside Court',
  details:
    'Water drips under the sink when the tap runs. Cupboard floor is wet. Reported by Peter Otieno on 31 Oct. Tenant home after 5 pm.',
  tenantPhotos: 3,
  initialStep: 2,
  initialCost: shillings(1800),
} as const;

export const OTHER_JOBS = [
  {
    id: 'WO-0229',
    title: 'Gate lock sticking, Main gate',
    where: 'Baraka Flats',
    status: 'Assigned',
  },
  {
    id: 'WO-0226',
    title: 'Bulb replacement, stairwell C',
    where: 'Mvule Apartments',
    status: 'Assigned',
  },
] as const;

// ---- manager ----------------------------------------------------------------------------

export interface UnmatchedItem {
  id: string;
  reference: string;
  amount: bigint;
  channel: Extract<PaymentChannel, 'mpesa_paybill' | 'bank'>;
  /** E.164, render masked. */
  payerPhone: string;
  accountEntered: string;
  suggestion?: { tenantId: string; invoiceId: string; label: string };
}

export function listUnmatchedItems(src: DemoData): UnmatchedItem[] {
  return listUnmatched(src).map((u) => {
    const s = u.suggestions[0];
    const t = s ? src.tenants.find((x) => x.id === s.tenantId) : undefined;
    const code = t ? src.units.find((x) => x.id === t.unitId)?.code : undefined;
    return {
      id: u.id,
      reference: u.reference,
      amount: u.amount,
      channel: u.channel,
      payerPhone: u.payerPhone,
      accountEntered: u.accountEntered,
      ...(s && t && code
        ? {
            suggestion: {
              tenantId: s.tenantId,
              invoiceId: s.invoiceId,
              label: `${code} · ${t.name}`,
            },
          }
        : {}),
    };
  });
}

export interface UnusualReading {
  id: string;
  unit: string;
  property: string;
  used: number;
  usual: number;
}

export const UNUSUAL_READINGS: readonly UnusualReading[] = [
  { id: 'rd-m14', unit: 'M-14', property: 'Mvule Apartments', used: 62, usual: 11 },
];

export interface ManagerAlert {
  id: string;
  mark: string;
  tone: 'ok' | 'warn' | 'danger' | 'info';
  title: string;
  body: string;
  time: string;
  unread: boolean;
  action?: { label: string; message: string };
}

export const MANAGER_ALERTS: readonly ManagerAlert[] = [
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
    action: { label: 'Retry', message: 'Retrying 3 reminders' },
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
    action: { label: 'Sign out all devices', message: 'Signed out of all other devices' },
  },
];

export interface ManagerHomeData {
  collection: CollectionSummary;
  cashCount: number;
  cashTotal: bigint;
  unmatchedCount: number;
  unmatchedTotal: bigint;
  recorder: string;
}

export function getManagerHome(src: DemoData): ManagerHomeData {
  const cash = listCashEntries(src).filter((c) => c.status === 'awaiting_approval');
  return {
    collection: getCollection(src),
    cashCount: cash.length,
    cashTotal: sumMinor(cash.map((c) => c.amount)),
    unmatchedCount: src.unmatched.length,
    unmatchedTotal: sumMinor(src.unmatched.map((u) => u.amount)),
    recorder: CARETAKER_NAME,
  };
}

export interface TenantQuickCard {
  tenant: TenantRow;
  lastPaymentAmount?: bigint;
  lastPaymentLabel?: string;
  nextDueDate?: string;
}

export function searchTenants(src: DemoData, q: string, limit = 8): TenantRow[] {
  return listTenants(src, q).slice(0, limit);
}

export function getQuickCard(src: DemoData, tenantId: string): TenantQuickCard | undefined {
  const tenant = listTenants(src).find((t) => t.id === tenantId);
  if (!tenant) return undefined;
  const last = src.payments
    .filter((p) => p.tenantId === tenantId && p.status === 'matched')
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  const due = src.invoices
    .filter((i) => i.tenantId === tenantId && i.balance > 0n)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return {
    tenant,
    ...(last
      ? {
          lastPaymentAmount: last.amount,
          lastPaymentLabel: `${shortDay(last.receivedAt)} · ${last.reference}`,
        }
      : {}),
    ...(due ? { nextDueDate: due.dueDate } : {}),
  };
}
