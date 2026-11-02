/**
 * Demo data API. Pages call these functions, never raw arrays, so each one can later be swapped
 * for a real query (see docs/PROTOTYPE.md for the route to backend task map).
 *
 * Every function takes an optional `src` as its LAST argument. Server pages omit it (static seed).
 * Client pages that must react to DemoStore mutations pass `useDemoStore().data`.
 */
import { DEMO_TODAY, seedData } from './seed';
import type {
  AuditEvent,
  DataRequest,
  DemoData,
  Expense,
  Invoice,
  InvoiceStatus,
  Landlord,
  Lease,
  Member,
  Message,
  MeterReading,
  Notice,
  Organization,
  Payment,
  Plan,
  Property,
  Remittance,
  Template,
  Tenant,
  Ticket,
  TicketMessage,
  TicketStatus,
  Unit,
  UnmatchedPayment,
} from './types';

export * from './types';
export { DEMO_TODAY, seedData };

const must = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new Error(`Demo data: ${what} not found`);
  return v;
};

// ---- organization & plans ---------------------------------------------------------------

export const getOrganization = (src: DemoData = seedData): Organization => src.org;
export const listPlans = (src: DemoData = seedData): Plan[] => src.plans;
export const getCurrentPlan = (src: DemoData = seedData): Plan =>
  must(
    src.plans.find((p) => p.id === src.org.plan),
    'plan',
  );
export const listMembers = (src: DemoData = seedData): Member[] => src.members;
export const listAuditEvents = (src: DemoData = seedData): AuditEvent[] =>
  [...src.auditEvents].sort((a, b) => b.at.localeCompare(a.at));
export const listTemplates = (src: DemoData = seedData): Template[] => src.templates;
export const listMessages = (src: DemoData = seedData): Message[] =>
  [...src.messages].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
export const listDataRequests = (src: DemoData = seedData): DataRequest[] => src.dataRequests;
export const listNotices = (src: DemoData = seedData): Notice[] => src.notices;
export const listLandlords = (src: DemoData = seedData): Landlord[] => src.landlords;
export const getLandlord = (id: string, src: DemoData = seedData): Landlord | undefined =>
  src.landlords.find((l) => l.id === id);
export const listRemittances = (landlordId?: string, src: DemoData = seedData): Remittance[] =>
  src.remittances.filter((r) => !landlordId || r.landlordId === landlordId);

// ---- properties & units -----------------------------------------------------------------

export interface PropertySummary extends Property {
  unitCount: number;
  occupied: number;
  vacant: number;
  expected: number;
  collected: number;
  outstanding: number;
  collectedPct: number;
}

function summarize(p: Property, src: DemoData): PropertySummary {
  const units = src.units.filter((u) => u.propertyId === p.id);
  const invoices = src.invoices.filter((i) => i.propertyId === p.id);
  const expected = invoices.reduce((s, i) => s + i.total, 0);
  const collected = invoices.reduce((s, i) => s + i.paid, 0);
  const vacant = units.filter((u) => u.status === 'vacant').length;
  return {
    ...p,
    unitCount: units.length,
    occupied: units.length - vacant,
    vacant,
    expected,
    collected,
    outstanding: expected - collected,
    collectedPct: expected === 0 ? 0 : Math.round((collected / expected) * 100),
  };
}

export const listProperties = (src: DemoData = seedData): PropertySummary[] =>
  src.properties.map((p) => summarize(p, src));
export const getProperty = (id: string, src: DemoData = seedData): PropertySummary | undefined => {
  const p = src.properties.find((x) => x.id === id);
  return p ? summarize(p, src) : undefined;
};

export interface UnitRow extends Unit {
  tenantName?: string;
  balance: number;
}

export function listUnits(propertyId: string, src: DemoData = seedData): UnitRow[] {
  return src.units
    .filter((u) => u.propertyId === propertyId)
    .map((u) => ({
      ...u,
      tenantName: src.tenants.find((t) => t.id === u.tenantId)?.name,
      balance: src.invoices.filter((i) => i.unitId === u.id).reduce((s, i) => s + i.balance, 0),
    }));
}

export const getUnit = (id: string, src: DemoData = seedData): Unit | undefined =>
  src.units.find((u) => u.id === id);

// ---- tenants ----------------------------------------------------------------------------

export interface TenantRow extends Tenant {
  unitCode: string;
  propertyName: string;
  balance: number;
}

export interface TenantFilter {
  propertyId?: string;
  q?: string;
  /** 'arrears' = balance > 0 */
  status?: 'all' | 'arrears';
}

export function listTenants(filter: TenantFilter = {}, src: DemoData = seedData): TenantRow[] {
  const q = filter.q?.trim().toLowerCase();
  return src.tenants
    .filter((t) => !filter.propertyId || t.propertyId === filter.propertyId)
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
      balance: src.invoices.filter((i) => i.tenantId === t.id).reduce((s, i) => s + i.balance, 0),
    }))
    .filter((t) => (filter.status === 'arrears' ? t.balance > 0 : true))
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.unitCode.toLowerCase().includes(q));
}

export interface TenantDetail {
  tenant: TenantRow;
  unit: Unit;
  property: Property;
  lease: Lease;
  invoices: Invoice[];
  payments: Payment[];
  tickets: Ticket[];
}

export function getTenant(id: string, src: DemoData = seedData): TenantDetail | undefined {
  const row = listTenants({}, src).find((t) => t.id === id);
  if (!row) return undefined;
  return {
    tenant: row,
    unit: must(
      src.units.find((u) => u.id === row.unitId),
      'unit',
    ),
    property: must(
      src.properties.find((p) => p.id === row.propertyId),
      'property',
    ),
    lease: must(
      src.leases.find((l) => l.id === row.leaseId),
      'lease',
    ),
    invoices: src.invoices.filter((i) => i.tenantId === id),
    payments: src.payments.filter((p) => p.tenantId === id),
    tickets: src.tickets.filter((t) => t.tenantId === id),
  };
}

/** The persona used for the tenant mobile views: Peter Otieno, B-12 Riverside Court. */
export const DEMO_TENANT_ID = 'ten_B-12';
export const listLeases = (src: DemoData = seedData): Lease[] => src.leases;

// ---- invoices ---------------------------------------------------------------------------

export interface InvoiceRow extends Invoice {
  tenantName: string;
  unitCode: string;
  propertyName: string;
}

export interface InvoiceFilter {
  propertyId?: string;
  tenantId?: string;
  status?: InvoiceStatus | 'open';
  q?: string;
}

export function listInvoices(filter: InvoiceFilter = {}, src: DemoData = seedData): InvoiceRow[] {
  const q = filter.q?.trim().toLowerCase();
  return src.invoices
    .filter((i) => !filter.propertyId || i.propertyId === filter.propertyId)
    .filter((i) => !filter.tenantId || i.tenantId === filter.tenantId)
    .filter(
      (i) =>
        !filter.status || (filter.status === 'open' ? i.balance > 0 : i.status === filter.status),
    )
    .map((i) => ({
      ...i,
      tenantName: must(
        src.tenants.find((t) => t.id === i.tenantId),
        'tenant',
      ).name,
      unitCode: must(
        src.units.find((u) => u.id === i.unitId),
        'unit',
      ).code,
      propertyName: must(
        src.properties.find((p) => p.id === i.propertyId),
        'property',
      ).name,
    }))
    .filter(
      (i) =>
        !q ||
        i.tenantName.toLowerCase().includes(q) ||
        i.unitCode.toLowerCase().includes(q) ||
        i.number.toLowerCase().includes(q),
    );
}

export const getInvoice = (id: string, src: DemoData = seedData): InvoiceRow | undefined =>
  listInvoices({}, src).find((i) => i.id === id);

// ---- payments ---------------------------------------------------------------------------

export interface PaymentRow extends Payment {
  tenantName: string;
  unitCode: string;
}

export interface PaymentFilter {
  status?: Payment['status'];
  channel?: Payment['channel'];
  propertyId?: string;
}

export function listPayments(filter: PaymentFilter = {}, src: DemoData = seedData): PaymentRow[] {
  return src.payments
    .filter((p) => !filter.status || p.status === filter.status)
    .filter((p) => !filter.channel || p.channel === filter.channel)
    .filter((p) => !filter.propertyId || p.propertyId === filter.propertyId)
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

export const listUnmatched = (src: DemoData = seedData): UnmatchedPayment[] =>
  [...src.unmatched].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

// ---- tickets ----------------------------------------------------------------------------

export interface TicketRow extends Ticket {
  tenantName: string;
  unitCode: string;
  propertyName: string;
}

export interface TicketFilter {
  status?: TicketStatus | 'open';
  propertyId?: string;
  tenantId?: string;
  q?: string;
}

export const isOpenTicket = (t: Pick<Ticket, 'status'>): boolean =>
  t.status !== 'resolved' && t.status !== 'closed';

function toTicketRow(t: Ticket, src: DemoData): TicketRow {
  return {
    ...t,
    tenantName: must(
      src.tenants.find((x) => x.id === t.tenantId),
      'tenant',
    ).name,
    unitCode: must(
      src.units.find((u) => u.id === t.unitId),
      'unit',
    ).code,
    propertyName: must(
      src.properties.find((p) => p.id === t.propertyId),
      'property',
    ).name,
  };
}

export function listTickets(filter: TicketFilter = {}, src: DemoData = seedData): TicketRow[] {
  const q = filter.q?.trim().toLowerCase();
  return src.tickets
    .filter((t) => !filter.propertyId || t.propertyId === filter.propertyId)
    .filter((t) => !filter.tenantId || t.tenantId === filter.tenantId)
    .filter(
      (t) =>
        !filter.status || (filter.status === 'open' ? isOpenTicket(t) : t.status === filter.status),
    )
    .map((t) => toTicketRow(t, src))
    .filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.unitCode.toLowerCase().includes(q) ||
        t.tenantName.toLowerCase().includes(q),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface TicketDetail {
  ticket: TicketRow;
  messages: TicketMessage[];
}

export function getTicket(id: string, src: DemoData = seedData): TicketDetail | undefined {
  const t = src.tickets.find((x) => x.id === id);
  if (!t) return undefined;
  return {
    ticket: toTicketRow(t, src),
    messages: src.ticketMessages
      .filter((m) => m.ticketId === id)
      .sort((a, b) => a.at.localeCompare(b.at)),
  };
}

// ---- expenses & utilities ---------------------------------------------------------------

export const listExpenses = (propertyId?: string, src: DemoData = seedData): Expense[] =>
  src.expenses
    .filter((e) => !propertyId || e.propertyId === propertyId)
    .sort((a, b) => b.date.localeCompare(a.date));

export const listMeterReadings = (propertyId?: string, src: DemoData = seedData): MeterReading[] =>
  src.meterReadings.filter((m) => !propertyId || m.propertyId === propertyId);

// ---- badges & dashboard -----------------------------------------------------------------

export interface BadgeCounts {
  openTickets: number;
  unmatched: number;
  cashPending: number;
  /** unmatched + cash awaiting approval: the Payments nav badge */
  payments: number;
}

export function getBadgeCounts(src: DemoData = seedData): BadgeCounts {
  const unmatched = src.unmatched.length;
  const cashPending = src.payments.filter((p) => p.status === 'awaiting_approval').length;
  return {
    openTickets: src.tickets.filter(isOpenTicket).length,
    unmatched,
    cashPending,
    payments: unmatched,
  };
}

export interface AttentionItem {
  id: string;
  title: string;
  sub: string;
  href: string;
  tone: 'warning' | 'info' | 'muted';
}

export interface AgingBucket {
  label: string;
  amount: number;
  tenants: number;
}

export interface LatestPayment {
  id: string;
  receivedAt: string;
  who: string;
  unit: string;
  channel: Payment['channel'];
  reference: string;
  amount: number;
  status: 'matched' | 'unmatched' | 'awaiting_approval';
}

export interface Dashboard {
  dateLabel: string;
  kpis: {
    expected: number;
    collected: number;
    outstanding: number;
    collectedPct: number;
    units: number;
    occupied: number;
    vacant: number;
    tenantsPaid: number;
    tenantsWithBalance: number;
    occupancyPct: number;
    noticesToVacate: number;
  };
  byProperty: PropertySummary[];
  attention: AttentionItem[];
  latestPayments: LatestPayment[];
  aging: AgingBucket[];
}

export function getDashboard(src: DemoData = seedData): Dashboard {
  const props = listProperties(src);
  const expected = props.reduce((s, p) => s + p.expected, 0);
  const collected = props.reduce((s, p) => s + p.collected, 0);
  const units = props.reduce((s, p) => s + p.unitCount, 0);
  const occupied = props.reduce((s, p) => s + p.occupied, 0);
  const open = src.invoices.filter((i) => i.balance > 0);

  const bucketOf = (days: number) => (days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3);
  const labels = ['0–30 days', '31–60 days', '61–90 days', 'Over 90 days'];
  const aging: AgingBucket[] = labels.map((label) => ({ label, amount: 0, tenants: 0 }));
  for (const inv of open) {
    const b = must(aging[bucketOf(inv.oldestUnpaidDays)], 'bucket');
    b.amount += inv.balance;
    b.tenants += 1;
  }

  const badges = getBadgeCounts(src);
  const unmatchedTotal = src.unmatched.reduce((s, u) => s + u.amount, 0);
  const metered = src.meterReadings.filter((m) => m.propertyId === 'prop_mvule');
  const readingsDone = metered.filter((m) => m.status !== 'pending').length;
  const endingLeases = src.leases.filter((l) => l.status === 'ending_soon');

  const kes = (minor: number) => `KES ${Math.round(minor / 100).toLocaleString('en-KE')}`;
  const attention: AttentionItem[] = [
    {
      id: 'att_unmatched',
      title: `${badges.unmatched} unmatched M-Pesa payments`,
      sub: `${kes(unmatchedTotal)} · wrong or missing account numbers`,
      href: '/payments',
      tone: 'warning',
    },
    {
      id: 'att_cash',
      title: `${badges.cashPending} cash payments awaiting approval`,
      sub: 'Recorded by caretaker Otieno at Baraka Flats',
      href: '/payments',
      tone: 'warning',
    },
    {
      id: 'att_water',
      title: `Water readings ${readingsDone} of ${metered.length} done`,
      sub: 'Mvule Apartments · due before invoicing',
      href: '/utilities',
      tone: 'info',
    },
    {
      id: 'att_tax',
      title: 'Rental income tax due 20 Nov',
      sub: 'October MRI report ready to download',
      href: '/reports',
      tone: 'info',
    },
    {
      id: 'att_leases',
      title: `${endingLeases.length} leases end within 30 days`,
      sub: endingLeases
        .map(
          (l) =>
            `${
              must(
                src.units.find((u) => u.id === l.unitId),
                'unit',
              ).code
            }`,
        )
        .join(' · '),
      href: '/tenants',
      tone: 'muted',
    },
  ];

  const latest: LatestPayment[] = [
    ...listPayments({}, src).map((p): LatestPayment => ({
      id: p.id,
      receivedAt: p.receivedAt,
      who: p.tenantName,
      unit: p.unitCode,
      channel: p.channel,
      reference: p.reference,
      amount: p.amount,
      status: p.status === 'awaiting_approval' ? 'awaiting_approval' : 'matched',
    })),
    ...src.unmatched.map((u): LatestPayment => ({
      id: u.id,
      receivedAt: u.receivedAt,
      who: 'Unknown payer',
      unit: u.accountEntered ? `acc “${u.accountEntered}”` : 'no account',
      channel: u.channel,
      reference: u.reference,
      amount: u.amount,
      status: 'unmatched',
    })),
  ]
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 6);

  return {
    dateLabel: 'Monday, 2 November 2026',
    kpis: {
      expected,
      collected,
      outstanding: expected - collected,
      collectedPct: Math.round((collected / expected) * 100),
      units,
      occupied,
      vacant: units - occupied,
      tenantsPaid: src.invoices.filter((i) => i.status === 'paid').length,
      tenantsWithBalance: open.length,
      occupancyPct: Math.round((occupied / units) * 1000) / 10,
      noticesToVacate: src.notices.filter((n) => n.kind === 'vacate').length,
    },
    byProperty: props,
    attention,
    latestPayments: latest,
    aging,
  };
}
