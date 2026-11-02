import { useSyncExternalStore } from 'react';

/** Prototype-only: voided invoice ids kept in module memory (resets on reload). */
let voided: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

export function voidInvoice(id: string): void {
  voided = new Set([...voided, id]);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const EMPTY: ReadonlySet<string> = new Set();

export function useVoidedInvoices(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => voided,
    () => EMPTY,
  );
}
