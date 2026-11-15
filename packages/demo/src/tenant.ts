/**
 * Tenant persona for the phone views: Peter Otieno, B-12 Riverside Court, balance KES 16,700.
 * Amounts are bigint KES cents. Pure data and helpers, no UI imports.
 */
import { shortDay } from './format';
import { shillings, sumMinor } from './money';
import { DEMO_TENANT_ID, isOpenTicket, listTicketMessages, listTicketRows } from './queries';
import { DEMO_TODAY } from './seed';
import type { DemoData, TicketMessage, TicketStatus } from './types';

export { DEMO_TENANT_ID, isOpenTicket };

/** Obviously fake demo paybill (never a real business number). */
export const PAYBILL_PLACEHOLDER = '000111';
export const TENANT_ACCOUNT = 'B-12';
export const TENANT_NAME = 'Peter Otieno';
export const TENANT_FIRST_NAME = 'Peter';
export const LANDLORD_NAME = 'Mwangi Properties';
export const PROPERTY_LABEL = 'B-12 · Riverside Court';
export const DUE_LABEL = '5 November';
export const MIN_NOTICE_DAYS = 30;

export interface DueLine {
  label: string;
  amount: bigint;
}

/** Charges making up the balance, in allocation order (oldest first). */
export const DUE_LINES: readonly DueLine[] = [
  { label: 'Water · October', amount: shillings(1200) },
  { label: 'Late fee · October', amount: shillings(200) },
  { label: 'November rent', amount: shillings(14000) },
  { label: 'Service charge', amount: shillings(1300) },
];

/** Display order used on the home screen. */
export const HOME_LINES: readonly DueLine[] = [
  { label: 'November rent', amount: shillings(14000) },
  { label: 'Service charge', amount: shillings(1300) },
  { label: 'Water · October (13 units)', amount: shillings(1200) },
  { label: 'Late fee · October', amount: shillings(200) },
];

export const BALANCE: bigint = sumMinor(DUE_LINES.map((l) => l.amount));
export const RENT_ONLY: bigint = shillings(14000);

export interface Allocation {
  lines: DueLine[];
  newBalance: bigint;
}

/** Oldest charges are settled first; whatever is left stays as the balance. */
export function allocatePayment(amount: bigint): Allocation {
  let left = amount;
  const lines: DueLine[] = [];
  for (const l of DUE_LINES) {
    if (left <= 0n) break;
    const part = left < l.amount ? left : l.amount;
    lines.push({ label: part < l.amount ? `${l.label} (part)` : l.label, amount: part });
    left -= part;
  }
  const remaining = BALANCE - amount;
  return { lines, newBalance: remaining > 0n ? remaining : 0n };
}

export interface ReceiptItem {
  title: string;
  ref: string;
  /** Nairobi timestamp. */
  paidAt: string;
  /** Short label such as "3 Oct". */
  when: string;
  amount: bigint;
}

const receipt = (title: string, ref: string, paidAt: string, kes: number): ReceiptItem => ({
  title,
  ref,
  paidAt,
  when: shortDay(paidAt),
  amount: shillings(kes),
});

export const RECENT_RECEIPTS: readonly ReceiptItem[] = [
  receipt('October rent', 'TJ9K2LQ7XA', '2026-10-03T11:14:00+03:00', 15300),
  receipt('September rent', 'TI4B8MN2VD', '2026-09-04T10:02:00+03:00', 15300),
  receipt('August rent', 'TH1Q5WE9RS', '2026-08-02T13:41:00+03:00', 16100),
];

/** The reference shown on the receipt for a payment made in the demo session. */
export const DEMO_RECEIPT = { code: 'TK2H8L3M9P', paidAt: '2026-11-02T09:41:00+03:00' } as const;

export interface LedgerEntry {
  title: string;
  sub: string;
  /** Positive adds to what is owed (invoice); negative reduces it (payment). */
  delta: bigint;
}

export interface LedgerRow extends LedgerEntry {
  balance: bigint;
}

export const STATEMENT_MONTHS = [
  { key: 'nov', label: 'Nov 2026' },
  { key: 'oct', label: 'Oct 2026' },
  { key: 'sep', label: 'Sep 2026' },
] as const;
export type StatementMonth = (typeof STATEMENT_MONTHS)[number]['key'];

const LEDGER: Record<StatementMonth, LedgerEntry[]> = {
  nov: [
    { title: 'November rent', sub: 'Invoice · 1 Nov', delta: shillings(14000) },
    { title: 'Service charge', sub: 'Invoice · 1 Nov', delta: shillings(1300) },
    { title: 'Water · October (13 units)', sub: 'Invoice · 1 Nov', delta: shillings(1200) },
    { title: 'Late fee · October', sub: 'Invoice · 5 Nov', delta: shillings(200) },
  ],
  oct: [
    { title: 'October rent', sub: 'Invoice · 1 Oct', delta: shillings(14000) },
    { title: 'Service charge', sub: 'Invoice · 1 Oct', delta: shillings(1300) },
    { title: 'Payment · M-Pesa', sub: 'TJ9K2LQ7XA · 3 Oct', delta: -shillings(15300) },
  ],
  sep: [
    { title: 'September rent', sub: 'Invoice · 1 Sep', delta: shillings(14000) },
    { title: 'Service charge', sub: 'Invoice · 1 Sep', delta: shillings(1300) },
    { title: 'Payment · M-Pesa', sub: 'TI4B8MN2VD · 4 Sep', delta: -shillings(15300) },
  ],
};

/** Running balance, newest entry first. Every month opens at zero in this persona. */
export function getLedger(month: StatementMonth): LedgerRow[] {
  let running = 0n;
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

export const TENANT_NOTICES: readonly TenantNotice[] = [
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
] as const;

/** Earliest allowed move-out date: today plus the lease notice period, as YYYY-MM-DD. */
export function earliestVacateDate(): string {
  const d = new Date(`${DEMO_TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + MIN_NOTICE_DAYS);
  return d.toISOString().slice(0, 10);
}

// ---- tickets ----------------------------------------------------------------------------

export const EMERGENCY_GUIDANCE = 'Fire, gas leak or break-in? Call 999 or 112 first.';

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
export const REQUEST_KINDS: readonly { id: RequestKind; label: string; hint: string }[] = [
  { id: 'repair', label: 'Repair', hint: 'Something is broken' },
  { id: 'complaint', label: 'Complaint', hint: 'Neighbour, security, staff' },
  { id: 'billing', label: 'Billing question', hint: 'A charge or payment' },
  { id: 'other', label: 'Other', hint: 'Anything else' },
];

export const URGENCY_LEVELS = ['Low', 'Normal', 'High', 'Urgent'] as const;
export const ACCESS_TIMES = ['Morning', 'Afternoon', 'Evening', 'Anytime'] as const;
export const COMPLAINT_ABOUT = [
  'Neighbour or noise',
  'Security',
  'Cleanliness or garbage',
  'Caretaker or staff conduct',
  'Landlord or management',
  'Other',
] as const;

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

const CATEGORY_LABEL = {
  plumbing: 'Repair',
  electrical: 'Repair',
  security: 'Complaint',
  water: 'Repair',
  structural: 'Repair',
  other: 'Other',
} as const;

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

/** The tenant's own tickets (seeded plus any created this session), newest activity first. */
export function listMyTickets(
  tenantId: string,
  data: DemoData,
  local: readonly LocalTicket[],
): TenantTicketView[] {
  const seeded = listTicketRows(data)
    .filter((t) => t.tenantId === tenantId)
    .map((t): TenantTicketView => ({
      id: t.id,
      number: t.number,
      title: t.title,
      kindLabel: CATEGORY_LABEL[t.category],
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      ...(t.assignee ? { assignee: t.assignee } : {}),
      messages: listTicketMessages(data, t.id).filter((m) => !m.internal),
      local: false,
    }));
  return [...local.map(fromLocal), ...seeded].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

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
