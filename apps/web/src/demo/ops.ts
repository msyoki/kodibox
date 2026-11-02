/**
 * Prototype helpers for tickets, maintenance, move-outs and utilities (P-04).
 * Pure functions over the existing demo data. No seed numbers are changed.
 */
import {
  DEMO_TODAY,
  listMeterReadings,
  listTickets,
  seedData,
  type DemoData,
  type Ticket,
  type TicketRow,
} from './index';
import { kes } from '@/lib/money';

export const NOW_ISO = '2026-11-02T10:00:00+03:00';
const HOUR = 3_600_000;

export type TicketType = 'Complaint' | 'Repair' | 'Billing query';

export function ticketType(t: Pick<Ticket, 'title' | 'category'>): TicketType {
  const s = t.title.toLowerCase();
  if (/(noise|neighbour|caretaker|staff|rude|loud)/.test(s)) return 'Complaint';
  if (/(bill|invoice|charge|charged|statement)/.test(s)) return 'Billing query';
  return 'Repair';
}

export const PRIORITY_LABEL: Record<Ticket['priority'], string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

/** Resolution targets by urgency, in hours. */
const TARGET_HOURS: Record<Ticket['priority'], number> = {
  urgent: 24,
  high: 72,
  normal: 120,
  low: 168,
};

export interface Sla {
  label: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
  breached: boolean;
}

function fmtHours(h: number): string {
  const a = Math.abs(h);
  if (a < 24) return `${Math.max(1, Math.round(a))}h`;
  return `${Math.floor(a / 24)}d ${Math.round(a % 24)}h`;
}

export function ticketSla(t: Pick<Ticket, 'createdAt' | 'priority' | 'status'>): Sla {
  if (t.status === 'resolved' || t.status === 'closed') {
    return { label: 'Closed out', tone: 'neutral', breached: false };
  }
  const elapsed = (Date.parse(NOW_ISO) - Date.parse(t.createdAt)) / HOUR;
  const left = TARGET_HOURS[t.priority] - elapsed;
  if (left < 0) return { label: `Overdue ${fmtHours(left)}`, tone: 'danger', breached: true };
  if (left < TARGET_HOURS[t.priority] * 0.25) {
    return { label: `${fmtHours(left)} left`, tone: 'warn', breached: false };
  }
  return { label: `${fmtHours(left)} left`, tone: 'ok', breached: false };
}

export interface TicketStats {
  open: number;
  breached: number;
  avgResolve: string;
  satisfaction: string;
}

export function ticketStats(src: DemoData = seedData): TicketStats {
  const all = listTickets({}, src);
  const open = all.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
  const done = all.filter((t) => t.status === 'resolved' || t.status === 'closed');
  const hours = done.length
    ? done.reduce((s, t) => s + (Date.parse(t.updatedAt) - Date.parse(t.createdAt)) / HOUR, 0) /
      done.length
    : 0;
  return {
    open: open.length,
    breached: open.filter((t) => ticketSla(t).breached).length,
    avgResolve: fmtHours(hours),
    satisfaction: '4.4 / 5',
  };
}

export function isStaffComplaint(t: Pick<Ticket, 'title'>): boolean {
  return /(caretaker|staff|rude)/i.test(t.title);
}

export const ASSIGNEES = [
  'Otieno Ouma (caretaker)',
  'Kamau Plumbing (vendor)',
  'Brightline Electricals (vendor)',
  'Wanjiru Mwangi (Owner)',
];

export function daysUntil(iso: string): number {
  return Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(DEMO_TODAY)) / (24 * HOUR));
}

// ---- maintenance ------------------------------------------------------------------------

export type WorkOrderColumn = 'new' | 'assigned' | 'in_progress' | 'done';

export interface WorkOrder {
  id: string;
  ticketId: string;
  number: string;
  where: string;
  title: string;
  by: string;
  vendor: string;
  priority: Ticket['priority'];
  column: WorkOrderColumn;
}

export function listWorkOrders(src: DemoData = seedData): WorkOrder[] {
  const rows: TicketRow[] = listTickets({}, src).filter((t) => ticketType(t) === 'Repair');
  const colOf = (t: TicketRow): WorkOrderColumn =>
    t.status === 'new'
      ? 'new'
      : t.status === 'assigned'
        ? 'assigned'
        : t.status === 'in_progress'
          ? 'in_progress'
          : 'done';
  const orders: WorkOrder[] = rows.map((t) => ({
    id: `wo_${t.id}`,
    ticketId: t.id,
    number: t.number,
    where: `${t.unitCode} · ${t.propertyName}`,
    title: t.title,
    by: `${t.tenantName} via app`,
    vendor: t.assignee ?? 'Not assigned',
    priority: t.priority,
    column: colOf(t),
  }));
  const done = orders.filter((o) => o.column === 'done').slice(0, 3);
  return [...orders.filter((o) => o.column !== 'done'), ...done];
}

// ---- move-outs --------------------------------------------------------------------------

export const MOVE_OUT_TENANT_ID = 'ten_A-07';

export interface InspectionRoom {
  room: string;
  condition: string;
  tone: 'ok' | 'warn' | 'danger';
  note: string;
  photos: number;
}

export const INSPECTION: InspectionRoom[] = [
  { room: 'Living room', condition: 'Good', tone: 'ok', note: 'Normal wear on walls', photos: 6 },
  {
    room: 'Bedroom 1',
    condition: 'Repaint needed',
    tone: 'warn',
    note: 'Marks and scuffs on two walls',
    photos: 8,
  },
  { room: 'Bedroom 2', condition: 'Good', tone: 'ok', note: 'Clean, no damage', photos: 4 },
  {
    room: 'Kitchen',
    condition: 'Fair',
    tone: 'warn',
    note: 'Tap works, grease on tiles',
    photos: 5,
  },
  { room: 'Bathroom', condition: 'Damaged', tone: 'danger', note: 'Window pane broken', photos: 5 },
  {
    room: 'Water meter',
    condition: 'Unpaid',
    tone: 'danger',
    note: 'Final reading leaves KES 800 unpaid',
    photos: 2,
  },
];

export interface Deduction {
  id: string;
  label: string;
  amount: number;
}

export const DEDUCTIONS: Deduction[] = [
  { id: 'd1', label: 'Repaint, bedroom 1', amount: kes(4500) },
  { id: 'd2', label: 'Broken bathroom window', amount: kes(2000) },
  { id: 'd3', label: 'Unpaid water', amount: kes(800) },
];

/** Refund = held minus itemised deductions, never below zero. */
export function refundAmount(held: number, deductions: { amount: number }[]): number {
  return Math.max(0, held - deductions.reduce((s, d) => s + d.amount, 0));
}

export interface NoticeRow {
  id: string;
  kind: 'Vacation notice' | 'Rent increase' | 'Lease end';
  tone: 'info' | 'warn' | 'ok';
  counter: string;
  title: string;
  sub: string;
}

export const RENT_INCREASE_NOTICES: NoticeRow[] = [
  {
    id: 'ri_1',
    kind: 'Rent increase',
    tone: 'warn',
    counter: 'Sent 28 Oct · 60 days',
    title: 'C-02 Riverside Court · Mercy Achieng',
    sub: 'KES 17,500 to KES 18,500 from 1 Jan 2027. Delivered by SMS and app, read 29 Oct.',
  },
  {
    id: 'ri_2',
    kind: 'Rent increase',
    tone: 'warn',
    counter: 'Draft',
    title: 'Baraka Flats · 6 units (2-bedroom)',
    sub: 'Not sent. Needs your review of the advocate template before sending.',
  },
];

// ---- utilities --------------------------------------------------------------------------

export interface TariffTier {
  from: number;
  to: number | null;
  rate: number;
}

export const FLAT_WATER_RATE = kes(150);
export const TIERS: TariffTier[] = [
  { from: 0, to: 6, rate: kes(120) },
  { from: 7, to: 20, rate: kes(150) },
  { from: 21, to: null, rate: kes(190) },
];

export interface ReadingRow {
  id: string;
  unitCode: string;
  previous: number;
  current: number | null;
  used: number | null;
  avg: number;
  amount: number | null;
  readBy: string;
  flagged: boolean;
}

export const MVULE_ID = 'prop_mvule';

/** Readings with a deterministic 3-month average; two recorded Mvule units are shown as 3x outliers. */
export function listReadingRows(propertyId: string, src: DemoData = seedData): ReadingRow[] {
  const readings = listMeterReadings(propertyId, src);
  let recorded = 0;
  return readings.map((m, idx) => {
    const unit = src.units.find((u) => u.id === m.unitId);
    const avg = 8 + (idx % 3);
    let current = m.current;
    if (current !== null) {
      recorded += 1;
      if (propertyId === MVULE_ID && (recorded === 4 || recorded === 12)) {
        current = m.previous + avg * 3 + 2;
      }
    }
    const used = current === null ? null : current - m.previous;
    return {
      id: m.id,
      unitCode: unit?.code ?? m.unitId,
      previous: m.previous,
      current,
      used,
      avg,
      amount: used === null ? null : used * m.ratePerUnit,
      readBy: m.recordedBy ?? '-',
      flagged: used !== null && used >= avg * 3,
    };
  });
}
