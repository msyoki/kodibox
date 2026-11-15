'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LocalTicket, RequestKind } from '@/demo/tenant-app';
import type { TicketMessage, TicketStatus } from '@/demo/types';

const NOW = '2026-11-02T10:00:00+03:00';

export interface Feedback {
  rating: number;
  fixed: boolean;
}

interface TenantLocal {
  localTickets: LocalTicket[];
  addTicket: (input: { title: string; kind: RequestKind; body: string }) => string;
  setLocalStatus: (id: string, status: TicketStatus) => void;
  addLocalMessage: (id: string, body: string) => void;
  feedback: Record<string, Feedback>;
  setFeedback: (id: string, f: Partial<Feedback>) => void;
  vacateDate: string | null;
  setVacateDate: (d: string | null) => void;
}

const Ctx = createContext<TenantLocal | null>(null);

export function useTenantLocal(): TenantLocal {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTenantLocal must be used inside <TenantLocalProvider>');
  return v;
}

/** Session-only state for the tenant views (resets on reload, like DemoStore). */
export function TenantLocalProvider({ children }: { children: ReactNode }) {
  const [localTickets, setLocalTickets] = useState<LocalTicket[]>([]);
  const [feedback, setFeedbackState] = useState<Record<string, Feedback>>({});
  const [vacateDate, setVacateDate] = useState<string | null>(null);

  const addTicket = useCallback((input: { title: string; kind: RequestKind; body: string }) => {
    const id = `local_${Date.now()}`;
    const msg: TicketMessage = {
      id: `${id}_m1`,
      ticketId: id,
      author: 'You',
      role: 'tenant',
      body: input.body,
      at: NOW,
      internal: false,
    };
    setLocalTickets((prev) => [
      {
        id,
        number: `T-${1100 + prev.length}`,
        title: input.title,
        kind: input.kind,
        status: 'new',
        createdAt: NOW,
        updatedAt: NOW,
        messages: [msg],
      },
      ...prev,
    ]);
    return id;
  }, []);

  const setLocalStatus = useCallback((id: string, status: TicketStatus) => {
    setLocalTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, updatedAt: NOW } : t)),
    );
  }, []);

  const addLocalMessage = useCallback((id: string, body: string) => {
    setLocalTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              updatedAt: NOW,
              messages: [
                ...t.messages,
                {
                  id: `${id}_m${t.messages.length + 1}`,
                  ticketId: id,
                  author: 'You',
                  role: 'tenant' as const,
                  body,
                  at: NOW,
                  internal: false,
                },
              ],
            }
          : t,
      ),
    );
  }, []);

  const setFeedback = useCallback((id: string, f: Partial<Feedback>) => {
    setFeedbackState((prev) => ({
      ...prev,
      [id]: { rating: 0, fixed: false, ...prev[id], ...f },
    }));
  }, []);

  const value = useMemo(
    () => ({
      localTickets,
      addTicket,
      setLocalStatus,
      addLocalMessage,
      feedback,
      setFeedback,
      vacateDate,
      setVacateDate,
    }),
    [localTickets, addTicket, setLocalStatus, addLocalMessage, feedback, setFeedback, vacateDate],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
