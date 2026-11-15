import {
  CARETAKER_NAME,
  DEMO_TENANT_ID,
  INITIAL_OUTBOX,
  UNUSUAL_READINGS,
  demoSeed,
  listCashEntries,
  listMyTickets,
  type CashEntry,
  type CashStatus,
  type DemoData,
  type Expense,
  type LocalTicket,
  type MeterReading,
  type UnusualReading,
  type OutboxItem,
  type RequestKind,
  type TenantTicketView,
  type TicketMessage,
  type TicketStatus,
} from '@kodibox/demo';
import { initialJobStates, type JobState } from '@/lib/jobs';
import { nowClock, nowIso } from '@/lib/format';
import { flagSavedReadings, mergeReadings } from '@/lib/readings';
import {
  runDemoImport,
  seedClaims,
  type Claim,
  type ImportLine,
  type ImportSummary,
} from '@/lib/payments-engine';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface Feedback {
  rating: number;
  fixed: boolean;
}

interface Override {
  status?: TicketStatus;
  extra: TicketMessage[];
}

export type ImportDecision =
  | { kind: 'assigned'; tenantId: string; unitCode: string; tenantName: string; ref?: string }
  | { kind: 'not_rent'; reason: string; ref?: string };

export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  detail: string;
}

export interface SentMessage {
  id: string;
  to: string;
  unitCode: string;
  body: string;
  at: string;
}

interface DemoState {
  data: DemoData;

  // manager desk modules (local, in-memory)
  ticketPatch: Record<string, { status?: TicketStatus; assignee?: string }>;
  patchTicket: (id: string, patch: { status?: TicketStatus; assignee?: string }) => void;
  expenseStatus: Record<string, Expense['status']>;
  setExpenseStatus: (id: string, status: Expense['status']) => void;
  moveOutChecks: Record<string, string[]>;
  toggleMoveOutCheck: (noticeId: string, item: string) => void;
  approvedReadings: string[];
  approveReading: (id: string) => void;
  sentMessages: SentMessage[];
  sendMessage: (m: Omit<SentMessage, 'id' | 'at'>) => void;

  // tenant
  /** Total verified in this demo session, KES cents (claims a manager approved). */
  paid: bigint;
  /** Proofs of payment: tenant-made claims plus sample claims from other tenants. */
  claims: Claim[];
  addClaim: (
    c: Pick<Claim, 'code' | 'amount' | 'paidAt' | 'via'> & { accountRef?: string },
  ) => string;
  approveClaim: (id: string) => void;
  rejectClaim: (id: string, reason: string) => void;
  tickets: TenantTicketView[];
  addTicket: (input: { title: string; kind: RequestKind; body: string }) => string;
  setTicketStatus: (id: string, status: TicketStatus) => void;
  addTicketMessage: (id: string, body: string) => void;
  feedback: Record<string, Feedback>;
  setFeedback: (id: string, f: Partial<Feedback>) => void;
  vacateDate: string | null;
  setVacateDate: (d: string | null) => void;

  // caretaker (offline outbox is local to the device)
  outbox: OutboxItem[];
  syncedAt: string;
  queueOutbox: (label: string) => void;
  syncNow: () => void;
  readingsDone: Record<string, number>;
  saveReading: (id: string, value: number, unitCode: string) => void;
  /** Mvule readings with caretaker saves applied (what the manager sees). */
  readings: MeterReading[];
  /** Seed flags plus any reading the caretaker just saved that looks unusual. */
  flaggedReadings: UnusualReading[];
  jobs: Record<string, JobState>;
  markJobDone: (id: string, cost: bigint) => void;
  auditLog: AuditEntry[];

  // cash is shared: caretaker makes entries, manager approves them
  cash: CashEntry[];
  addCash: (e: { unitCode: string; tenantName: string; reference: string; amount: bigint }) => void;
  setCashStatus: (id: string, status: CashStatus) => void;

  // manager: last statement import (demo), its unmatched lines and what the manager decided
  lastImport: ImportSummary;
  importLines: ImportLine[];
  importDecisions: Record<string, ImportDecision>;
  resolveImportLine: (id: string, d: ImportDecision) => void;
  resolvedReadings: string[];
  resolveReading: (id: string) => void;
  readAlerts: string[];
  markAlertRead: (id: string) => void;
  markAllAlertsRead: (ids: string[]) => void;
}

const Ctx = createContext<DemoState | null>(null);

export function useDemo(): DemoState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemo must be used inside DemoStateProvider');
  return v;
}

/** In-memory demo state for every role. Nothing is persisted or sent anywhere. */
export function DemoStateProvider({ children }: { children: ReactNode }) {
  const data = demoSeed;

  const [paid, setPaid] = useState(0n);
  const importRun = useMemo(() => runDemoImport(demoSeed, nowIso()), []);
  const [claims, setClaims] = useState<Claim[]>(() =>
    seedClaims(demoSeed, importRun.claimOutcomes),
  );
  const [localTickets, setLocalTickets] = useState<LocalTicket[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [feedback, setFeedbackState] = useState<Record<string, Feedback>>({});
  const [vacateDate, setVacateDate] = useState<string | null>(null);

  const [outbox, setOutbox] = useState<OutboxItem[]>([...INITIAL_OUTBOX]);
  const [syncedAt, setSyncedAt] = useState('9:42 am');
  const [readingsDone, setReadingsDone] = useState<Record<string, number>>({});
  const [jobs, setJobs] = useState<Record<string, JobState>>(initialJobStates);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const [cash, setCash] = useState<CashEntry[]>(() => listCashEntries(demoSeed));

  const [importDecisions, setImportDecisions] = useState<Record<string, ImportDecision>>({});
  const [resolvedReadings, setResolvedReadings] = useState<string[]>([]);
  const [readAlerts, setReadAlerts] = useState<string[]>([]);

  const [ticketPatch, setTicketPatch] = useState<
    Record<string, { status?: TicketStatus; assignee?: string }>
  >({});
  const [expenseStatus, setExpenseStatusState] = useState<Record<string, Expense['status']>>({});
  const [moveOutChecks, setMoveOutChecks] = useState<Record<string, string[]>>({});
  const [approvedReadings, setApprovedReadings] = useState<string[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

  const patchTicket = useCallback(
    (id: string, patch: { status?: TicketStatus; assignee?: string }) =>
      setTicketPatch((p) => ({ ...p, [id]: { ...p[id], ...patch } })),
    [],
  );
  const setExpenseStatus = useCallback(
    (id: string, status: Expense['status']) =>
      setExpenseStatusState((e) => ({ ...e, [id]: status })),
    [],
  );
  const toggleMoveOutCheck = useCallback(
    (noticeId: string, item: string) =>
      setMoveOutChecks((c) => {
        const cur = c[noticeId] ?? [];
        return {
          ...c,
          [noticeId]: cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item],
        };
      }),
    [],
  );
  const approveReading = useCallback((id: string) => setApprovedReadings((r) => [...r, id]), []);
  const sendMessage = useCallback(
    (m: Omit<SentMessage, 'id' | 'at'>) =>
      setSentMessages((s) => [{ ...m, id: `sent_${s.length + 1}`, at: nowIso() }, ...s]),
    [],
  );

  const addClaim = useCallback(
    (c: Pick<Claim, 'code' | 'amount' | 'paidAt' | 'via'> & { accountRef?: string }) => {
      const id = `claim_local_${Date.now()}`;
      const tenant = demoSeed.tenants.find((t) => t.id === DEMO_TENANT_ID);
      const unit = demoSeed.units.find((u) => u.id === tenant?.unitId);
      setClaims((prev) => [
        {
          ...c,
          id,
          by: 'tenant',
          tenantId: DEMO_TENANT_ID,
          tenantName: tenant?.name ?? 'Tenant',
          unitCode: unit?.code ?? '',
          status: 'pending',
          ...(tenant?.leaseId ? { leaseId: tenant.leaseId } : {}),
        },
        ...prev,
      ]);
      return id;
    },
    [],
  );

  const approveClaim = useCallback(
    (id: string) => {
      const c = claims.find((x) => x.id === id);
      if (!c || c.status !== 'pending') return;
      setClaims((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'approved' } : x)));
      if (c.tenantId === DEMO_TENANT_ID) setPaid((p) => p + c.amount);
    },
    [claims],
  );

  const rejectClaim = useCallback((id: string, reason: string) => {
    setClaims((prev) =>
      prev.map((x) =>
        x.id === id && x.status === 'pending' ? { ...x, status: 'rejected', reason } : x,
      ),
    );
  }, []);

  const addTicket = useCallback((input: { title: string; kind: RequestKind; body: string }) => {
    const id = `local_${Date.now()}`;
    setLocalTickets((prev) => [
      {
        id,
        number: `T-${1100 + prev.length}`,
        title: input.title,
        kind: input.kind,
        status: 'new',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        messages: [
          {
            id: `${id}_m1`,
            ticketId: id,
            author: 'You',
            role: 'tenant',
            body: input.body,
            at: nowIso(),
            internal: false,
          },
        ],
      },
      ...prev,
    ]);
    return id;
  }, []);

  const setTicketStatus = useCallback((id: string, status: TicketStatus) => {
    if (id.startsWith('local_')) {
      setLocalTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, updatedAt: nowIso() } : t)),
      );
    } else {
      setOverrides((o) => ({ ...o, [id]: { extra: [], ...o[id], status } }));
    }
  }, []);

  const addTicketMessage = useCallback((id: string, body: string) => {
    const make = (n: number): TicketMessage => ({
      id: `${id}_m${n}`,
      ticketId: id,
      author: 'You',
      role: 'tenant',
      body,
      at: nowIso(),
      internal: false,
    });
    if (id.startsWith('local_')) {
      setLocalTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, updatedAt: nowIso(), messages: [...t.messages, make(t.messages.length + 1)] }
            : t,
        ),
      );
    } else {
      setOverrides((o) => {
        const cur = o[id] ?? { extra: [] };
        return { ...o, [id]: { ...cur, extra: [...cur.extra, make(900 + cur.extra.length)] } };
      });
    }
  }, []);

  const setFeedback = useCallback((id: string, f: Partial<Feedback>) => {
    setFeedbackState((prev) => ({ ...prev, [id]: { rating: 0, fixed: false, ...prev[id], ...f } }));
  }, []);

  const queueOutbox = useCallback((label: string) => {
    setOutbox((o) => [...o, { id: `ob_${Date.now()}_${o.length}`, label, when: nowClock() }]);
  }, []);

  const syncNow = useCallback(() => {
    setOutbox([]);
    setSyncedAt(nowClock());
  }, []);

  const saveReading = useCallback(
    (id: string, value: number, unitCode: string) => {
      setReadingsDone((d) => ({ ...d, [id]: value }));
      queueOutbox(`Meter reading ${unitCode} with photo`);
    },
    [queueOutbox],
  );

  const markJobDone = useCallback((id: string, cost: bigint) => {
    setJobs((j) => ({ ...j, [id]: { step: 3, cost } }));
  }, []);

  const addCash = useCallback(
    (e: { unitCode: string; tenantName: string; reference: string; amount: bigint }) => {
      setCash((c) => [
        {
          id: `local_cash_${c.length + 1}`,
          ...e,
          receivedAt: nowIso(),
          status: 'awaiting_approval',
          recordedBy: CARETAKER_NAME,
        },
        ...c,
      ]);
      queueOutbox(`Cash entry ${e.unitCode} · ${e.reference}`);
    },
    [queueOutbox],
  );

  const setCashStatus = useCallback((id: string, status: CashStatus) => {
    setCash((c) => c.map((e) => (e.id === id ? { ...e, status } : e)));
  }, []);

  const resolveImportLine = useCallback((id: string, d: ImportDecision) => {
    setImportDecisions((m) => ({ ...m, [id]: d }));
    setAuditLog((a) => [
      {
        id: `audit_${a.length + 1}`,
        at: nowIso(),
        action: d.kind === 'not_rent' ? 'statement_line.not_rent' : 'statement_line.assigned',
        detail:
          d.kind === 'not_rent'
            ? `${d.ref ?? id}: marked not rent. Reason: ${d.reason}`
            : `${d.ref ?? id}: assigned to ${d.unitCode} · ${d.tenantName}`,
      },
      ...a,
    ]);
  }, []);
  const resolveReading = useCallback((id: string) => setResolvedReadings((r) => [...r, id]), []);
  const markAlertRead = useCallback((id: string) => setReadAlerts((r) => [...r, id]), []);
  const markAllAlertsRead = useCallback((ids: string[]) => setReadAlerts(ids), []);

  const readings = useMemo(
    () => mergeReadings(data.meterReadings, readingsDone, CARETAKER_NAME),
    [data, readingsDone],
  );
  const flaggedReadings = useMemo(
    () => [
      ...UNUSUAL_READINGS,
      ...flagSavedReadings(
        data,
        data.meterReadings.filter((m) => m.propertyId === 'prop_mvule'),
        readingsDone,
        'Mvule Apartments',
      ),
    ],
    [data, readingsDone],
  );

  const tickets = useMemo(
    () =>
      listMyTickets(DEMO_TENANT_ID, data, localTickets).map((t) => {
        const o = overrides[t.id];
        if (!o) return t;
        return { ...t, status: o.status ?? t.status, messages: [...t.messages, ...o.extra] };
      }),
    [data, localTickets, overrides],
  );

  const value = useMemo<DemoState>(
    () => ({
      data,
      ticketPatch,
      patchTicket,
      expenseStatus,
      setExpenseStatus,
      moveOutChecks,
      toggleMoveOutCheck,
      approvedReadings,
      approveReading,
      sentMessages,
      sendMessage,
      paid,
      claims,
      addClaim,
      approveClaim,
      rejectClaim,
      tickets,
      addTicket,
      setTicketStatus,
      addTicketMessage,
      feedback,
      setFeedback,
      vacateDate,
      setVacateDate,
      outbox,
      syncedAt,
      queueOutbox,
      syncNow,
      readingsDone,
      saveReading,
      readings,
      flaggedReadings,
      jobs,
      markJobDone,
      auditLog,
      cash,
      addCash,
      setCashStatus,
      lastImport: importRun.summary,
      importLines: importRun.unmatched,
      importDecisions,
      resolveImportLine,
      resolvedReadings,
      resolveReading,
      readAlerts,
      markAlertRead,
      markAllAlertsRead,
    }),
    [
      data,
      ticketPatch,
      patchTicket,
      expenseStatus,
      setExpenseStatus,
      moveOutChecks,
      toggleMoveOutCheck,
      approvedReadings,
      approveReading,
      sentMessages,
      sendMessage,
      paid,
      claims,
      addClaim,
      approveClaim,
      rejectClaim,
      tickets,
      addTicket,
      setTicketStatus,
      addTicketMessage,
      feedback,
      setFeedback,
      vacateDate,
      outbox,
      syncedAt,
      queueOutbox,
      syncNow,
      readingsDone,
      saveReading,
      readings,
      flaggedReadings,
      jobs,
      markJobDone,
      auditLog,
      cash,
      addCash,
      setCashStatus,
      importRun,
      importDecisions,
      resolveImportLine,
      resolvedReadings,
      resolveReading,
      readAlerts,
      markAlertRead,
      markAllAlertsRead,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Counts shown on the manager Approvals tab, header and Home. */
export function usePendingCounts() {
  const { claims, importLines, importDecisions, cash, resolvedReadings, flaggedReadings } =
    useDemo();
  return useMemo(() => {
    const claimsN = claims.filter((c) => c.status === 'pending').length;
    const openLines = importLines.filter((l) => !importDecisions[l.id]);
    const cashN = cash.filter((c) => c.status === 'awaiting_approval').length;
    const readingsN = flaggedReadings.filter((r) => !resolvedReadings.includes(r.id)).length;
    return {
      claims: claimsN,
      lines: openLines.length,
      linesTotal: openLines.reduce((s, l) => s + l.amount, 0n),
      cash: cashN,
      readings: readingsN,
      total: claimsN + openLines.length + cashN + readingsN,
    };
  }, [claims, importLines, importDecisions, cash, resolvedReadings, flaggedReadings]);
}
