'use client';

/**
 * DemoStore: in-memory, client-only mutations for demos. Resets on reload. No persistence, no network.
 *
 * Usage (client component):
 *   const { data, actions } = useDemoStore();
 *   const unmatched = listUnmatched(data);   // pass `data` as the last arg of any demo query
 *   actions.matchPayment(unmatchedId, tenantId, invoiceId);
 *
 * Every action also appends an AuditEvent, mirroring the rule that state changes are audited.
 * Later backend tasks replace each action with a Server Action returning Result<T, AppError>.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getBadgeCounts, seedData, type BadgeCounts } from './index';
import type { AuditEvent, DemoData, Invoice, Payment, TicketMessage, TicketStatus } from './types';

export interface NewTicketMessage {
  author: string;
  role: TicketMessage['role'];
  body: string;
  internal?: boolean;
}

export interface DemoActions {
  /** Match an unmatched M-Pesa payment to a tenant invoice (creates a matched Payment, updates the invoice). */
  matchPayment: (unmatchedId: string, tenantId: string, invoiceId: string) => void;
  /** Maker-checker: approve a caretaker-recorded cash payment. */
  approveCash: (paymentId: string, approver?: string) => void;
  rejectCash: (paymentId: string, approver?: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  addTicketMessage: (ticketId: string, message: NewTicketMessage) => void;
  markRemitted: (remittanceId: string) => void;
  /** Reset to the seed data without reloading. */
  reset: () => void;
}

interface DemoStoreValue {
  data: DemoData;
  badges: BadgeCounts;
  actions: DemoActions;
}

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

const NOW = () => '2026-11-02T10:00:00+03:00';
const ACTOR = 'Wanjiru Mwangi';

function withAudit(
  d: DemoData,
  action: string,
  entity: string,
  summary: string,
  actor = ACTOR,
): DemoData {
  const event: AuditEvent = {
    id: `ae_live_${d.auditEvents.length + 1}`,
    at: NOW(),
    actor,
    action,
    entity,
    summary,
  };
  return { ...d, auditEvents: [event, ...d.auditEvents] };
}

function applyToInvoice(invoices: Invoice[], invoiceId: string, amount: number): Invoice[] {
  return invoices.map((i) => {
    if (i.id !== invoiceId) return i;
    const paid = Math.min(i.total, i.paid + amount);
    const balance = i.total - paid;
    return {
      ...i,
      paid,
      balance,
      status: balance === 0 ? 'paid' : 'partial',
      oldestUnpaidDays: balance === 0 ? 0 : i.oldestUnpaidDays,
    };
  });
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(() => structuredClone(seedData));

  const matchPayment = useCallback((unmatchedId: string, tenantId: string, invoiceId: string) => {
    setData((d) => {
      const um = d.unmatched.find((u) => u.id === unmatchedId);
      const tenant = d.tenants.find((t) => t.id === tenantId);
      const invoice = d.invoices.find((i) => i.id === invoiceId);
      if (!um || !tenant || !invoice) return d;
      const payment: Payment = {
        id: `pay_live_${um.id}`,
        tenantId,
        unitId: tenant.unitId,
        propertyId: tenant.propertyId,
        invoiceId,
        amount: um.amount,
        channel: um.channel,
        reference: um.reference,
        receivedAt: um.receivedAt,
        status: 'matched',
      };
      const next: DemoData = {
        ...d,
        unmatched: d.unmatched.filter((u) => u.id !== unmatchedId),
        payments: [payment, ...d.payments],
        invoices: applyToInvoice(d.invoices, invoiceId, um.amount),
      };
      return withAudit(
        next,
        'payment.matched',
        um.reference,
        `Matched ${um.reference} to ${tenant.name}`,
      );
    });
  }, []);

  const approveCash = useCallback((paymentId: string, approver = ACTOR) => {
    setData((d) => {
      const p = d.payments.find((x) => x.id === paymentId);
      if (!p || p.status !== 'awaiting_approval') return d;
      const next: DemoData = {
        ...d,
        payments: d.payments.map((x) =>
          x.id === paymentId ? { ...x, status: 'matched', approvedBy: approver } : x,
        ),
        invoices: applyToInvoice(d.invoices, p.invoiceId, p.amount),
      };
      return withAudit(
        next,
        'payment.cash_approved',
        p.reference,
        `Approved cash ${p.reference}`,
        approver,
      );
    });
  }, []);

  const rejectCash = useCallback((paymentId: string, approver = ACTOR) => {
    setData((d) => {
      const p = d.payments.find((x) => x.id === paymentId);
      if (!p || p.status !== 'awaiting_approval') return d;
      const next: DemoData = {
        ...d,
        payments: d.payments.map((x) => (x.id === paymentId ? { ...x, status: 'rejected' } : x)),
      };
      return withAudit(
        next,
        'payment.cash_rejected',
        p.reference,
        `Rejected cash ${p.reference}`,
        approver,
      );
    });
  }, []);

  const updateTicketStatus = useCallback((ticketId: string, status: TicketStatus) => {
    setData((d) => {
      const t = d.tickets.find((x) => x.id === ticketId);
      if (!t || t.status === status) return d;
      const next: DemoData = {
        ...d,
        tickets: d.tickets.map((x) => (x.id === ticketId ? { ...x, status, updatedAt: NOW() } : x)),
      };
      return withAudit(
        next,
        'ticket.status_changed',
        t.number,
        `${t.number}: ${t.status} to ${status}`,
      );
    });
  }, []);

  const addTicketMessage = useCallback((ticketId: string, message: NewTicketMessage) => {
    setData((d) => {
      if (!d.tickets.some((t) => t.id === ticketId)) return d;
      const msg: TicketMessage = {
        id: `${ticketId}_live_${d.ticketMessages.length + 1}`,
        ticketId,
        author: message.author,
        role: message.role,
        body: message.body,
        at: NOW(),
        internal: message.internal ?? false,
      };
      return {
        ...d,
        ticketMessages: [...d.ticketMessages, msg],
        tickets: d.tickets.map((t) => (t.id === ticketId ? { ...t, updatedAt: NOW() } : t)),
      };
    });
  }, []);

  const markRemitted = useCallback((remittanceId: string) => {
    setData((d) => {
      const r = d.remittances.find((x) => x.id === remittanceId);
      if (!r || r.status === 'remitted') return d;
      const next: DemoData = {
        ...d,
        remittances: d.remittances.map((x) =>
          x.id === remittanceId ? { ...x, status: 'remitted', remittedAt: NOW() } : x,
        ),
      };
      return withAudit(
        next,
        'remittance.marked_paid',
        remittanceId,
        `Marked remittance ${r.period} as paid`,
      );
    });
  }, []);

  const reset = useCallback(() => setData(structuredClone(seedData)), []);

  const value = useMemo<DemoStoreValue>(
    () => ({
      data,
      badges: getBadgeCounts(data),
      actions: {
        matchPayment,
        approveCash,
        rejectCash,
        updateTicketStatus,
        addTicketMessage,
        markRemitted,
        reset,
      },
    }),
    [
      data,
      matchPayment,
      approveCash,
      rejectCash,
      updateTicketStatus,
      addTicketMessage,
      markRemitted,
      reset,
    ],
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStoreValue {
  const ctx = useContext(DemoStoreContext);
  if (!ctx)
    throw new Error(
      'useDemoStore must be used inside <DemoStoreProvider> (provided by app/(app)/layout and app/m/layout)',
    );
  return ctx;
}
