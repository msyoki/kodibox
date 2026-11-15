/**
 * Number-cents mirror of ./types, used only by seed-build.ts. The seed calibration does a lot of
 * arithmetic (targets, percentages, rounding) on safe integers; seed.ts converts the finished
 * dataset to bigint minor units at the boundary, so nothing outside this package sees numbers.
 */
import type * as T from './types';

export type Raw<X> = X extends bigint
  ? number
  : X extends readonly (infer U)[]
    ? Raw<U>[]
    : X extends object
      ? { [K in keyof X]: Raw<X[K]> }
      : X;

export type AuditEvent = Raw<T.AuditEvent>;
export type DemoData = Raw<T.DemoData>;
export type Expense = Raw<T.Expense>;
export type Invoice = Raw<T.Invoice>;
export type InvoiceLine = Raw<T.InvoiceLine>;
export type Landlord = Raw<T.Landlord>;
export type Lease = Raw<T.Lease>;
export type MeterReading = Raw<T.MeterReading>;
export type Notice = Raw<T.Notice>;
export type Payment = Raw<T.Payment>;
export type Property = Raw<T.Property>;
export type Tenant = Raw<T.Tenant>;
export type Ticket = Raw<T.Ticket>;
export type TicketMessage = Raw<T.TicketMessage>;
export type Unit = Raw<T.Unit>;
export type UnmatchedPayment = Raw<T.UnmatchedPayment>;
export type PaymentChannel = T.PaymentChannel;
export type TicketPriority = T.TicketPriority;
export type TicketStatus = T.TicketStatus;
