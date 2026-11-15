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
import {
  addAudit,
  applyImport,
  applyToInvoice,
  approveClaim as approveClaimFn,
  assignUnmatched,
  ignoreUnmatched,
  rejectClaim as rejectClaimFn,
  restoreNotRent as restoreNotRentFn,
  savePaymentInstruction,
  splitUnmatched,
  submitClaim as submitClaimFn,
  type ClaimInput,
  type ImportPreview,
} from './recon';
import type {
  DemoData,
  ImportReminder,
  PaymentInstruction,
  TicketMessage,
  TicketStatus,
} from './types';

export interface NewTicketMessage {
  author: string;
  role: TicketMessage['role'];
  body: string;
  internal?: boolean;
}

export interface DemoActions {
  /** Assign an unmatched line to a tenant (oldest invoice first, preferring `invoiceId`; overpayment becomes credit). */
  matchPayment: (unmatchedId: string, tenantId: string, invoiceId?: string) => void;
  splitPayment: (unmatchedId: string, parts: { tenantId: string; amount: number }[]) => void;
  /** Set a line aside as not rent (reversible). */
  ignorePayment: (unmatchedId: string) => void;
  restoreNotRent: (id: string) => void;
  /** Commit a previewed statement import. */
  commitImport: (preview: ImportPreview) => void;
  submitClaim: (input: ClaimInput) => void;
  approveClaim: (claimId: string, note: string, assignTenantId?: string) => void;
  rejectClaim: (claimId: string, reason: string) => void;
  savePaymentInstruction: (i: PaymentInstruction) => void;
  setImportReminder: (r: ImportReminder) => void;
  /** Generic audited event for actions with no other state change (e.g. SMS reminders). */
  logAudit: (action: string, entity: string, summary: string) => void;
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
const withAudit = addAudit;

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(() => structuredClone(seedData));

  const matchPayment = useCallback((unmatchedId: string, tenantId: string, invoiceId?: string) => {
    setData((d) => assignUnmatched(d, unmatchedId, tenantId, invoiceId));
  }, []);
  const splitPayment = useCallback(
    (unmatchedId: string, parts: { tenantId: string; amount: number }[]) =>
      setData((d) => splitUnmatched(d, unmatchedId, parts)),
    [],
  );
  const ignorePayment = useCallback((id: string) => setData((d) => ignoreUnmatched(d, id)), []);
  const restoreNotRent = useCallback((id: string) => setData((d) => restoreNotRentFn(d, id)), []);
  const commitImport = useCallback(
    (preview: ImportPreview) => setData((d) => applyImport(d, preview)),
    [],
  );
  const submitClaim = useCallback(
    (input: ClaimInput) => setData((d) => submitClaimFn(d, input)),
    [],
  );
  const approveClaim = useCallback(
    (id: string, note: string, assign?: string) =>
      setData((d) => approveClaimFn(d, id, note, assign)),
    [],
  );
  const rejectClaim = useCallback(
    (id: string, reason: string) => setData((d) => rejectClaimFn(d, id, reason)),
    [],
  );
  const savePaymentInstructionAction = useCallback(
    (i: PaymentInstruction) => setData((d) => savePaymentInstruction(d, i)),
    [],
  );
  const setImportReminder = useCallback(
    (r: ImportReminder) =>
      setData((d) =>
        withAudit(
          { ...d, importReminder: r },
          'settings.import_reminder_changed',
          'import_reminder',
          `Statement import reminder set to ${r}`,
        ),
      ),
    [],
  );
  const logAudit = useCallback(
    (action: string, entity: string, summary: string) =>
      setData((d) => withAudit(d, action, entity, summary)),
    [],
  );

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
        splitPayment,
        ignorePayment,
        restoreNotRent,
        commitImport,
        submitClaim,
        approveClaim,
        rejectClaim,
        savePaymentInstruction: savePaymentInstructionAction,
        setImportReminder,
        logAudit,
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
      splitPayment,
      ignorePayment,
      restoreNotRent,
      commitImport,
      submitClaim,
      approveClaim,
      rejectClaim,
      savePaymentInstructionAction,
      setImportReminder,
      logAudit,
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
