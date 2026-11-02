/** Demo queries for the caretaker and manager phone views (P-06). Reuses seed data; no new numbers. */
import { listPayments, listTickets, listUnmatched, seedData, type DemoData } from './index';

export const CARETAKER_NAME = 'Otieno Ouma';

export interface ReadingItem {
  id: string;
  unitCode: string;
  previous: number;
  current: number | null;
  ratePerUnit: number;
  meter: string;
}

/** Mvule water readings in unit order: the first 18 are already recorded, 6 are pending. */
export function listReadingQueue(src: DemoData = seedData): ReadingItem[] {
  return src.meterReadings
    .filter((m) => m.propertyId === 'prop_mvule')
    .map((m) => {
      const code = src.units.find((u) => u.id === m.unitId)?.code ?? '?';
      return {
        id: m.id,
        unitCode: code,
        previous: m.previous,
        current: m.current,
        ratePerUnit: m.ratePerUnit,
        meter: `WM-${20000 + (m.previous % 900)}`,
      };
    });
}

export interface CashTenantOption {
  tenantId: string;
  label: string;
}

/** Baraka Flats tenants the caretaker can record cash for. */
export function listCashTenantOptions(src: DemoData = seedData): CashTenantOption[] {
  return src.tenants
    .filter((t) => t.propertyId === 'prop_baraka')
    .map((t) => ({
      tenantId: t.id,
      code: src.units.find((u) => u.id === t.unitId)?.code ?? '',
      name: t.name,
    }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((t) => ({ tenantId: t.tenantId, label: `${t.code} · ${t.name}` }));
}

/** Cash entries recorded by the caretaker (any status). */
export const listCaretakerCash = (src: DemoData = seedData) =>
  listPayments({ channel: 'cash' }, src).filter((p) => p.recordedBy === CARETAKER_NAME);

export const listPendingCash = (src: DemoData = seedData) =>
  listPayments({ status: 'awaiting_approval', channel: 'cash' }, src);

export { listUnmatched };

/** Tickets that count as past SLA in the demo: the two oldest urgent/high open tickets. */
export function listSlaBreaches(src: DemoData = seedData) {
  return listTickets({ status: 'open' }, src)
    .filter((t) => t.priority === 'urgent' || t.priority === 'high')
    .slice(0, 2);
}
