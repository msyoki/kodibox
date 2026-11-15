/** Read-only queries over the bigint demo dataset. Shaped for the phone views. */
import { sumMinor } from './money';
import type {
  DemoData,
  Invoice,
  Lease,
  Payment,
  Property,
  Tenant,
  Ticket,
  TicketMessage,
  TicketStatus,
  Unit,
  UnmatchedPayment,
} from './types';

export const DEMO_TENANT_ID = 'ten_B-12';

export function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`demo data: missing ${what}`);
  return value;
}

// ---- tenants ----------------------------------------------------------------------------

export interface TenantRow extends Tenant {
  unitCode: string;
  propertyName: string;
  balance: bigint;
}

export function listTenants(src: DemoData, q?: string): TenantRow[] {
  const needle = q?.trim().toLowerCase();
  return src.tenants
    .map((t) => ({
      ...t,
      unitCode: must(
        src.units.find((u) => u.id === t.unitId),
        'unit',
      ).code,
      propertyName: must(
        src.properties.find((p) => p.id === t.propertyId),
        'property',
      ).name,
      balance: sumMinor(src.invoices.filter((i) => i.tenantId === t.id).map((i) => i.balance)),
    }))
    .filter(
      (t) =>
        !needle ||
        t.name.toLowerCase().includes(needle) ||
        t.unitCode.toLowerCase().includes(needle),
    );
}

export interface TenantDetail {
  tenant: TenantRow;
  unit: Unit;
  property: Property;
  lease: Lease;
  invoices: Invoice[];
  payments: Payment[];
  lastPayment?: Payment;
  nextDueDate?: string;
}

export function getTenantDetail(src: DemoData, id: string): TenantDetail | undefined {
  const tenant = listTenants(src).find((t) => t.id === id);
  if (!tenant) return undefined;
  const payments = src.payments.filter((p) => p.tenantId === id);
  const invoices = src.invoices.filter((i) => i.tenantId === id);
  const lastPayment = payments
    .filter((p) => p.status === 'matched')
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  const nextDueDate = invoices
    .filter((i) => i.balance > 0n)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate;
  return {
    tenant,
    unit: must(
      src.units.find((u) => u.id === tenant.unitId),
      'unit',
    ),
    property: must(
      src.properties.find((p) => p.id === tenant.propertyId),
      'property',
    ),
    lease: must(
      src.leases.find((l) => l.id === tenant.leaseId),
      'lease',
    ),
    invoices,
    payments,
    ...(lastPayment ? { lastPayment } : {}),
    ...(nextDueDate ? { nextDueDate } : {}),
  };
}

// ---- payments ---------------------------------------------------------------------------

export interface PaymentRow extends Payment {
  tenantName: string;
  unitCode: string;
}

export function listCashPayments(src: DemoData): PaymentRow[] {
  return src.payments
    .filter((p) => p.channel === 'cash')
    .map((p) => ({
      ...p,
      tenantName: must(
        src.tenants.find((t) => t.id === p.tenantId),
        'tenant',
      ).name,
      unitCode: must(
        src.units.find((u) => u.id === p.unitId),
        'unit',
      ).code,
    }))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export const listUnmatched = (src: DemoData): UnmatchedPayment[] =>
  [...src.unmatched].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

// ---- tickets ----------------------------------------------------------------------------

export interface TicketRow extends Ticket {
  tenantName: string;
  unitCode: string;
}

export const isOpenTicket = (t: Pick<Ticket, 'status'>): boolean =>
  t.status !== 'resolved' && t.status !== 'closed';

export function listTicketRows(src: DemoData): TicketRow[] {
  return src.tickets
    .map((t) => ({
      ...t,
      tenantName: must(
        src.tenants.find((x) => x.id === t.tenantId),
        'tenant',
      ).name,
      unitCode: must(
        src.units.find((u) => u.id === t.unitId),
        'unit',
      ).code,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const listTicketMessages = (src: DemoData, ticketId: string): TicketMessage[] =>
  src.ticketMessages
    .filter((m) => m.ticketId === ticketId)
    .sort((a, b) => a.at.localeCompare(b.at));

export type { TicketStatus };

// ---- dashboard --------------------------------------------------------------------------

export interface PropertyCollection {
  id: string;
  name: string;
  expected: bigint;
  collected: bigint;
  /** Whole percent, 0 when nothing is expected. */
  pct: number;
}

export interface CollectionSummary {
  expected: bigint;
  collected: bigint;
  outstanding: bigint;
  pct: number;
  byProperty: PropertyCollection[];
}

const pctOf = (part: bigint, whole: bigint): number =>
  whole === 0n ? 0 : Number((part * 100n + whole / 2n) / whole);

export function getCollection(src: DemoData): CollectionSummary {
  const byProperty = src.properties.map((p) => {
    const inv = src.invoices.filter((i) => i.propertyId === p.id);
    const expected = sumMinor(inv.map((i) => i.total));
    const collected = sumMinor(inv.map((i) => i.paid));
    return { id: p.id, name: p.name, expected, collected, pct: pctOf(collected, expected) };
  });
  const expected = sumMinor(byProperty.map((p) => p.expected));
  const collected = sumMinor(byProperty.map((p) => p.collected));
  return {
    expected,
    collected,
    outstanding: expected - collected,
    pct: pctOf(collected, expected),
    byProperty,
  };
}
