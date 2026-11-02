/**
 * Static persona data and pure helpers for the tenant mobile views (P-06).
 * Persona: Peter Otieno, B-12 Riverside Court, balance KES 16,700. Amounts are integer KES cents.
 */
import { kes } from '@/lib/money';
import { DEMO_TODAY } from './seed';
import { getTicket, listTickets, type TicketRow } from './index';
import type { DemoData, TicketMessage, TicketStatus } from './types';

export const PAYBILL_PLACEHOLDER = '[PAYBILL]';
export const TENANT_ACCOUNT = 'B-12';
export const TENANT_FIRST_NAME = 'Peter';
export const LANDLORD_NAME = 'Mwangi Properties';
export const PROPERTY_LABEL = 'B-12 · Riverside Court';
export const DUE_LABEL = '5 November';
export const MIN_NOTICE_DAYS = 30;

export interface DueLine {
  label: string;
  amount: number;
}

/** Charges making up the balance, in allocation order (oldest first). */
export const DUE_LINES: DueLine[] = [
  { label: 'Water · October', amount: kes(1200) },
  { label: 'Late fee · October', amount: kes(200) },
  { label: 'November rent', amount: kes(14000) },
  { label: 'Service charge', amount: kes(1300) },
];

/** Display order used on the home screen. */
export const HOME_LINES: DueLine[] = [
  { label: 'November rent', amount: kes(14000) },
  { label: 'Service charge', amount: kes(1300) },
  { label: 'Water · October (13 units)', amount: kes(1200) },
  { label: 'Late fee · October', amount: kes(200) },
];

export const BALANCE = DUE_LINES.reduce((s, l) => s + l.amount, 0);
export const RENT_ONLY = kes(14000);

export interface Allocation {
  lines: DueLine[];
  newBalance: number;
}

/** Oldest charges are settled first; whatever is left stays as the balance. */
export function allocatePayment(amount: number): Allocation {
  let left = amount;
  const lines: DueLine[] = [];
  for (const l of DUE_LINES) {
    if (left <= 0) break;
    const part = Math.min(left, l.amount);
    lines.push({ label: part < l.amount ? `${l.label} (part)` : l.label, amount: part });
    left -= part;
  }
  return { lines, newBalance: Math.max(0, BALANCE - amount) };
}

export interface ReceiptItem {
  title: string;
  ref: string;
  when: string;
  amount: number;
}

export const RECENT_RECEIPTS: ReceiptItem[] = [
  { title: 'October rent', ref: 'TJ9K2LQ7XA', when: '3 Oct', amount: kes(15300) },
  { title: 'September rent', ref: 'TI4B8MN2VD', when: '4 Sep', amount: kes(15300) },
  { title: 'August rent', ref: 'TH1Q5WE9RS', when: '2 Aug', amount: kes(16100) },
];

export interface LedgerEntry {
  title: string;
  sub: string;
  /** Positive adds to what is owed (invoice); negative reduces it (payment). */
  delta: number;
}

export interface LedgerRow extends LedgerEntry {
  balance: number;
}

export const STATEMENT_MONTHS = [
  { key: 'nov', label: 'Nov 2026' },
  { key: 'oct', label: 'Oct 2026' },
  { key: 'sep', label: 'Sep 2026' },
] as const;
export type StatementMonth = (typeof STATEMENT_MONTHS)[number]['key'];

const LEDGER: Record<StatementMonth, LedgerEntry[]> = {
  nov: [
    { title: 'November rent', sub: 'Invoice · 1 Nov', delta: kes(14000) },
    { title: 'Service charge', sub: 'Invoice · 1 Nov', delta: kes(1300) },
    { title: 'Water · October (13 units)', sub: 'Invoice · 1 Nov', delta: kes(1200) },
    { title: 'Late fee · October', sub: 'Invoice · 5 Nov', delta: kes(200) },
  ],
  oct: [
    { title: 'October rent', sub: 'Invoice · 1 Oct', delta: kes(14000) },
    { title: 'Service charge', sub: 'Invoice · 1 Oct', delta: kes(1300) },
    { title: 'Payment · M-Pesa', sub: 'TJ9K2LQ7XA · 3 Oct', delta: -kes(15300) },
  ],
  sep: [
    { title: 'September rent', sub: 'Invoice · 1 Sep', delta: kes(14000) },
    { title: 'Service charge', sub: 'Invoice · 1 Sep', delta: kes(1300) },
    { title: 'Payment · M-Pesa', sub: 'TI4B8MN2VD · 4 Sep', delta: -kes(15300) },
  ],
};

/** Running balance, newest entry first. Every month opens at zero in this persona. */
export function getLedger(month: StatementMonth): LedgerRow[] {
  let running = 0;
  const rows = LEDGER[month].map((e) => {
    running += e.delta;
    return { ...e, balance: running };
  });
  return rows.reverse();
}

export interface TenantNotice {
  id: string;
  title: string;
  tag: 'Info' | 'Action';
  body: string;
  meta: string;
}

export const TENANT_NOTICES: TenantNotice[] = [
  {
    id: 'n1',
    title: 'Water interruption',
    tag: 'Info',
    body: 'Nairobi Water will cut supply on Thursday 5 Nov, 9:00 to 15:00 for pipe repairs. Please store water ahead.',
    meta: `Sent 2 Nov · ${LANDLORD_NAME}`,
  },
  {
    id: 'n2',
    title: 'Rent review notice',
    tag: 'Action',
    body: 'Rent for B-12 changes from KES 14,000 to KES 14,700 per month. Effective 1 February 2027, with 90 days notice as per your lease.',
    meta: `Sent 30 Oct · ${LANDLORD_NAME}`,
  },
];

export const TENANT_DOCS = [
  { id: 'lease', title: 'Lease agreement', sub: 'PDF · signed 1 Mar 2025' },
  { id: 'inspection', title: 'Move-in inspection report', sub: 'PDF · 14 photos · 1 Mar 2025' },
];

/** Earliest allowed move-out date: today plus the lease notice period, as YYYY-MM-DD. */
export function earliestVacateDate(): string {
  const d = new Date(`${DEMO_TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + MIN_NOTICE_DAYS);
  return d.toISOString().slice(0, 10);
}

// ---- tickets ----------------------------------------------------------------------------

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  new: 'Received',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TICKET_TONE: Record<TicketStatus, 'info' | 'warn' | 'ok' | 'neutral'> = {
  new: 'info',
  assigned: 'info',
  in_progress: 'warn',
  resolved: 'ok',
  closed: 'neutral',
};

export type RequestKind = 'repair' | 'complaint' | 'billing' | 'other';
export const REQUEST_KINDS: { id: RequestKind; label: string; hint: string }[] = [
  { id: 'repair', label: 'Repair', hint: 'Something is broken' },
  { id: 'complaint', label: 'Complaint', hint: 'Neighbour, security, staff' },
  { id: 'billing', label: 'Billing question', hint: 'A charge or payment' },
  { id: 'other', label: 'Other', hint: 'Anything else' },
];

export interface LocalTicket {
  id: string;
  number: string;
  title: string;
  kind: RequestKind;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface TenantTicketView {
  id: string;
  number: string;
  title: string;
  kindLabel: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  assignee?: string;
  /** Public messages only: internal notes never reach the tenant. */
  messages: TicketMessage[];
  local: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const whenLabel = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}${y !== '2026' ? ` ${y}` : ''}, ${iso.slice(11, 16)}`;
};

const CATEGORY_LABEL: Record<TicketRow['category'], string> = {
  plumbing: 'Repair',
  electrical: 'Repair',
  security: 'Complaint',
  water: 'Repair',
  structural: 'Repair',
  other: 'Other',
};

function fromLocal(t: LocalTicket): TenantTicketView {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    kindLabel: REQUEST_KINDS.find((k) => k.id === t.kind)?.label ?? 'Other',
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages: t.messages.filter((m) => !m.internal),
    local: true,
  };
}

export function listMyTickets(
  tenantId: string,
  data: DemoData,
  local: LocalTicket[],
): TenantTicketView[] {
  const seeded = listTickets({ tenantId }, data).map((t): TenantTicketView => {
    const detail = getTicket(t.id, data);
    return {
      id: t.id,
      number: t.number,
      title: t.title,
      kindLabel: CATEGORY_LABEL[t.category],
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      assignee: t.assignee,
      messages: (detail?.messages ?? []).filter((m) => !m.internal),
      local: false,
    };
  });
  return [...local.map(fromLocal), ...seeded].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export const isOpenStatus = (s: TicketStatus): boolean => s !== 'resolved' && s !== 'closed';

const STEPS: TicketStatus[] = ['new', 'assigned', 'in_progress', 'resolved'];

export interface TimelineStep {
  title: string;
  done: boolean;
}

export function ticketTimeline(status: TicketStatus, assignee?: string): TimelineStep[] {
  const idx = STEPS.indexOf(status === 'closed' ? 'resolved' : status);
  const titles = [
    'Received',
    'Acknowledged by your manager',
    assignee ? `In progress with ${assignee}` : 'In progress',
    'Resolved',
  ];
  return titles.map((title, i) => ({ title, done: i <= idx }));
}
