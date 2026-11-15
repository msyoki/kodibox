/**
 * Typed demo data model for the clickable prototype. Mirrors docs/DATA_MODEL.md loosely.
 * - Money fields are integer minor units (cents of KES): KES 14,000 = 1_400_000.
 * - Dates are ISO strings ("2026-11-05"); timestamps are ISO with offset (Africa/Nairobi, +03:00).
 * - "Tenant" is the renter; "Organization" is the SaaS customer.
 */

export type MinorUnits = number;
export type IsoDate = string;
export type IsoDateTime = string;

export type PlanId = 'starter' | 'growth' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: MinorUnits;
  unitLimit: number;
  features: string[];
}

export interface Organization {
  id: string;
  name: string;
  plan: PlanId;
  ownerName: string;
  /** Demo placeholder, never a real paybill number. */
  paybill: string;
  smsSenderId: string;
}

export interface Landlord {
  id: string;
  name: string;
  phone: string;
  propertyIds: string[];
  commissionPct: number;
  payoutMethod: 'bank' | 'mpesa';
}

export type PropertyKind = 'residential' | 'commercial';

export interface Property {
  id: string;
  orgId: string;
  name: string;
  area: string;
  kind: PropertyKind;
  landlordId: string;
  caretaker: string;
}

export type UnitStatus = 'occupied' | 'vacant' | 'notice';

export interface Unit {
  id: string;
  propertyId: string;
  code: string;
  type: string;
  rent: MinorUnits;
  serviceCharge: MinorUnits;
  status: UnitStatus;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  orgId: string;
  name: string;
  unitId: string;
  propertyId: string;
  /** E.164. Render only through <MaskedText kind="phone" />. */
  phone: string;
  /** Render only through <MaskedText kind="id" />. */
  nationalId: string;
  email?: string;
  leaseId: string;
  smsOptOut: boolean;
}

export interface Lease {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: IsoDate;
  endDate: IsoDate;
  rent: MinorUnits;
  deposit: MinorUnits;
  status: 'active' | 'ending_soon' | 'notice' | 'ended';
}

export type InvoiceLineKind = 'rent' | 'service' | 'water' | 'late_fee' | 'other';

export interface InvoiceLine {
  kind: InvoiceLineKind;
  label: string;
  amount: MinorUnits;
}

export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export interface Invoice {
  id: string;
  number: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  /** Billing period, "2026-11". */
  period: string;
  issueDate: IsoDate;
  dueDate: IsoDate;
  lines: InvoiceLine[];
  total: MinorUnits;
  paid: MinorUnits;
  balance: MinorUnits;
  status: InvoiceStatus;
  /** Age in days of the oldest unpaid charge rolled into this invoice (drives arrears aging). 0 when paid. */
  oldestUnpaidDays: number;
}

/** `mpesa_stk` is a legacy value the shared seed may still emit; the UI treats it as M-Pesa paybill. */
export type PaymentChannel = 'mpesa_paybill' | 'mpesa_stk' | 'bank' | 'cash';
/** Where the evidence for a payment came from. */
export type PaymentOrigin = 'statement' | 'claim' | 'cash';
export type PaymentStatus = 'matched' | 'awaiting_approval' | 'rejected';

export interface Payment {
  id: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  invoiceId: string;
  amount: MinorUnits;
  channel: PaymentChannel;
  /** M-Pesa code, bank ref or cash receipt number. */
  reference: string;
  receivedAt: IsoDateTime;
  status: PaymentStatus;
  /** Set for cash recorded by a caretaker (maker); approval is the checker step. */
  recordedBy?: string;
  approvedBy?: string;
  /** Statement import, verified/approved tenant claim, or cash. Absent on seed rows (derived from channel). */
  origin?: PaymentOrigin;
}

export interface UnmatchedSuggestion {
  tenantId: string;
  invoiceId: string;
  reason: string;
  /** 0..1 from the reconciliation engine. */
  confidence?: number;
}

export type UnmatchedReason =
  | 'ambiguous'
  | 'below_threshold'
  | 'no_signal'
  | 'conflict'
  | 'possible_duplicate'
  | 'unverified_claim';

export interface UnmatchedPayment {
  id: string;
  reference: string;
  amount: MinorUnits;
  payerName: string;
  /** E.164, render masked. */
  payerPhone: string;
  /** What the payer typed as the account number. */
  accountEntered: string;
  channel: Extract<PaymentChannel, 'mpesa_paybill' | 'bank'>;
  receivedAt: IsoDateTime;
  suggestions: UnmatchedSuggestion[];
  reason?: UnmatchedReason;
  confidence?: number;
  /** Already masked (statement imports only ever keep a hash plus this masked form). */
  payerPhoneMasked?: string;
}

export type ClaimStatus = 'pending' | 'verified' | 'approved' | 'rejected';

/** Tenant-submitted proof of payment, held until a statement line confirms it or a manager approves. */
export interface PaymentClaim {
  id: string;
  tenantId?: string;
  tenantName: string;
  unitCode: string;
  kind: 'sms' | 'slip';
  /** Pasted M-Pesa confirmation SMS (sms claims). */
  sms?: string;
  /** Parsed fields; absent for slips until a manager reads them. */
  code?: string;
  amount?: MinorUnits;
  paidAt?: IsoDateTime;
  slipName?: string;
  status: ClaimStatus;
  /** The pasted SMS names a payee that is not one of the org's payment instructions. */
  payeeMismatch?: boolean;
  submittedAt: IsoDateTime;
  reviewedBy?: string;
  /** Maker-checker note on approval, or the reason on rejection. */
  note?: string;
}

export interface PaymentInstruction {
  id: string;
  /** 'org' is the default; otherwise a property id overriding it. */
  scope: string;
  mpesaKind: 'paybill' | 'till' | 'none';
  /** Paybill or till number (demo placeholder). */
  mpesaNumber: string;
  /** Name M-Pesa shows on confirmation messages (used to spot proofs paid to someone else). */
  payeeName: string;
  /** The account reference tenants type is always their unit code. */
  accountRule: 'unit_code';
  bankName: string;
  bankAccount: string;
  bankBranch: string;
}

export type ImportReminder = 'off' | 'daily' | 'weekly';

export interface StatementImportRecord {
  id: string;
  at: IsoDateTime;
  sourceLabel: string;
  fileName: string;
  fresh: number;
  duplicates: number;
  autoMatched: number;
  needsReview: number;
  rowErrors: number;
  claimsVerified: number;
}

export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  number: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  title: string;
  category: 'plumbing' | 'electrical' | 'security' | 'water' | 'structural' | 'other';
  priority: TicketPriority;
  status: TicketStatus;
  assignee?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  author: string;
  role: 'tenant' | 'manager' | 'caretaker' | 'system';
  body: string;
  at: IsoDateTime;
  /** Internal notes are never shown to the tenant. */
  internal: boolean;
}

export interface Expense {
  id: string;
  propertyId: string;
  category: 'repairs' | 'utilities' | 'security' | 'cleaning' | 'insurance' | 'other';
  description: string;
  vendor: string;
  amount: MinorUnits;
  date: IsoDate;
  ticketId?: string;
  status: 'pending' | 'approved' | 'paid';
}

export interface MeterReading {
  id: string;
  unitId: string;
  propertyId: string;
  period: string;
  previous: number;
  current: number | null;
  ratePerUnit: MinorUnits;
  recordedBy?: string;
  status: 'pending' | 'recorded' | 'approved';
}

export interface Notice {
  id: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  kind: 'vacate' | 'lease_end' | 'rent_increase';
  issuedAt: IsoDate;
  effectiveDate: IsoDate;
  status: 'draft' | 'sent' | 'acknowledged';
}

export interface Remittance {
  id: string;
  landlordId: string;
  period: string;
  gross: MinorUnits;
  commission: MinorUnits;
  expenses: MinorUnits;
  net: MinorUnits;
  status: 'due' | 'remitted';
  remittedAt?: IsoDateTime;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'accountant' | 'caretaker';
  twoFactor: boolean;
  lastActive: IsoDateTime;
}

export interface AuditEvent {
  id: string;
  at: IsoDateTime;
  actor: string;
  action: string;
  entity: string;
  summary: string;
}

export interface Template {
  id: string;
  name: string;
  channel: 'sms' | 'email';
  body: string;
}

export interface Message {
  id: string;
  templateId?: string;
  channel: 'sms' | 'email';
  audience: string;
  recipients: number;
  body: string;
  sentAt: IsoDateTime;
  status: 'sent' | 'scheduled' | 'failed';
}

export interface DataRequest {
  id: string;
  tenantId: string;
  kind: 'export' | 'correction' | 'erasure';
  status: 'received' | 'in_review' | 'completed';
  receivedAt: IsoDate;
  dueAt: IsoDate;
}

/** The whole in-memory dataset. DemoStore holds a mutable copy of this. */
export interface DemoData {
  org: Organization;
  plans: Plan[];
  landlords: Landlord[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  invoices: Invoice[];
  payments: Payment[];
  unmatched: UnmatchedPayment[];
  /** Lines set aside as not rent (deposits, refunds, charges). Reversible. */
  notRent: UnmatchedPayment[];
  claims: PaymentClaim[];
  paymentInstructions: PaymentInstruction[];
  importReminder: ImportReminder;
  statementImports: StatementImportRecord[];
  /** Overpayments kept as tenant credit, by tenant id (minor units). */
  tenantCredits: Record<string, number>;
  tickets: Ticket[];
  ticketMessages: TicketMessage[];
  expenses: Expense[];
  meterReadings: MeterReading[];
  notices: Notice[];
  remittances: Remittance[];
  members: Member[];
  auditEvents: AuditEvent[];
  templates: Template[];
  messages: Message[];
  dataRequests: DataRequest[];
}
