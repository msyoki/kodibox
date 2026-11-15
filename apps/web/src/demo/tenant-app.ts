/**
 * Tenant mobile views (P-06). The persona data and pure helpers live in `@kodibox/demo` (bigint
 * KES cents, shared with the mobile app); this file adapts them to the number cents the web
 * prototype uses. Ticket views still run over the web store's data below.
 */
import {
  BALANCE as BALANCE_MINOR,
  DUE_LABEL,
  DUE_LINES as DUE_LINES_MINOR,
  HOME_LINES as HOME_LINES_MINOR,
  LANDLORD_NAME,
  MIN_NOTICE_DAYS,
  PAYBILL_PLACEHOLDER,
  PROPERTY_LABEL,
  RECENT_RECEIPTS as RECEIPTS_MINOR,
  RENT_ONLY as RENT_ONLY_MINOR,
  STATEMENT_MONTHS,
  TENANT_ACCOUNT,
  TENANT_DOCS,
  TENANT_FIRST_NAME,
  TENANT_NOTICES,
  allocatePayment as allocateMinor,
  earliestVacateDate,
  getLedger as getLedgerMinor,
  type StatementMonth,
} from '@kodibox/demo';
import { toNumbers } from './adapt';
import { getTicket, listTickets, type TicketRow } from './index';
import type { DemoData, TicketMessage, TicketStatus } from './types';

export {
  DUE_LABEL,
  LANDLORD_NAME,
  MIN_NOTICE_DAYS,
  PAYBILL_PLACEHOLDER,
  PROPERTY_LABEL,
  STATEMENT_MONTHS,
  TENANT_ACCOUNT,
  TENANT_DOCS,
  TENANT_FIRST_NAME,
  TENANT_NOTICES,
  earliestVacateDate,
};
export type { StatementMonth };
export type { TenantNotice } from '@kodibox/demo';

export interface DueLine {
  label: string;
  amount: number;
}

export const DUE_LINES: DueLine[] = toNumbers([...DUE_LINES_MINOR]);
export const HOME_LINES: DueLine[] = toNumbers([...HOME_LINES_MINOR]);
export const BALANCE = Number(BALANCE_MINOR);
export const RENT_ONLY = Number(RENT_ONLY_MINOR);

export interface Allocation {
  lines: DueLine[];
  newBalance: number;
}

export function allocatePayment(amount: number): Allocation {
  return toNumbers(allocateMinor(BigInt(amount)));
}

export interface ReceiptItem {
  title: string;
  ref: string;
  when: string;
  amount: number;
}

export const RECENT_RECEIPTS: ReceiptItem[] = RECEIPTS_MINOR.map((r) => ({
  title: r.title,
  ref: r.ref,
  when: r.when,
  amount: Number(r.amount),
}));

export interface LedgerEntry {
  title: string;
  sub: string;
  /** Positive adds to what is owed (invoice); negative reduces it (payment). */
  delta: number;
}

export interface LedgerRow extends LedgerEntry {
  balance: number;
}

/** Running balance, newest entry first. Every month opens at zero in this persona. */
export function getLedger(month: StatementMonth): LedgerRow[] {
  return toNumbers(getLedgerMinor(month));
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
