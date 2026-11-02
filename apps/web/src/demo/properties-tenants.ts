/** Extra demo queries for the properties and tenants screens (additive; reuses seed data). */
import {
  DEMO_TENANT_ID,
  getLandlord,
  listProperties,
  type PropertySummary,
  type TenantDetail,
} from './index';
import { formatDate } from './format';
import { kes } from '@/lib/money';

export interface PropertyCard extends PropertySummary {
  landlordName: string;
}

export function listPropertyCards(): PropertyCard[] {
  return listProperties().map((p) => ({
    ...p,
    landlordName: getLandlord(p.landlordId)?.name ?? 'Unassigned',
  }));
}

export interface LedgerRow {
  date: string;
  desc: string;
  ref: string;
  debit: number;
  credit: number;
  balance: number;
}

/** Statement ledger with running balance. Entries are never deleted; corrections post as reversals. */
export function buildStatement(d: TenantDetail): LedgerRow[] {
  if (d.tenant.id === DEMO_TENANT_ID) {
    const raw: [string, string, string, number, number][] = [
      ['1 Oct', 'October rent, service charge, garbage, water', 'INV-2026-0412', 16500, 0],
      ['8 Oct', 'Late fee (5% of KES 4,000 unpaid after grace)', 'PEN-0087', 200, 0],
      ['9 Oct', 'Payment received, M-Pesa paybill', 'TK2F9RT4KD', 0, 16500],
      ['1 Nov', 'November rent', 'INV-2026-0538', 14000, 0],
      ['1 Nov', 'Service charge (incl. garbage)', 'INV-2026-0538', 1300, 0],
      ['1 Nov', 'Water 10 units at KES 120', 'INV-2026-0538', 1200, 0],
    ];
    let bal = 0;
    return raw.map(([date, desc, ref, dr, cr]) => {
      bal += dr - cr;
      return { date, desc, ref, debit: kes(dr), credit: kes(cr), balance: kes(bal) };
    });
  }
  const entries: (Omit<LedgerRow, 'balance'> & { sort: string })[] = [];
  for (const i of d.invoices) {
    for (const l of i.lines) {
      entries.push({
        sort: i.issueDate,
        date: formatDate(i.issueDate),
        desc: l.label,
        ref: i.number,
        debit: l.amount,
        credit: 0,
      });
    }
  }
  for (const p of d.payments.filter((x) => x.status === 'matched')) {
    entries.push({
      sort: p.receivedAt,
      date: formatDate(p.receivedAt),
      desc: 'Payment received',
      ref: p.reference,
      debit: 0,
      credit: p.amount,
    });
  }
  entries.sort((a, b) => a.sort.localeCompare(b.sort));
  let bal = 0;
  return entries.map((e) => {
    bal += e.debit - e.credit;
    return {
      date: e.date,
      desc: e.desc,
      ref: e.ref,
      debit: e.debit,
      credit: e.credit,
      balance: bal,
    };
  });
}

export interface RevealedContact {
  phone: string;
  nationalId: string;
  kraPin: string;
}

/** Demo-only values so the Reveal button has something to show (fake data, no real PII). */
export function revealedContact(d: TenantDetail): RevealedContact {
  const digits = d.tenant.phone.replace(/\D/g, '');
  const local = digits.startsWith('254') ? `0${digits.slice(3)}` : digits;
  return {
    phone: `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`,
    nationalId: d.tenant.nationalId,
    kraPin: d.tenant.id === DEMO_TENANT_ID ? 'A004829317K' : `A00${d.tenant.nationalId.slice(-7)}K`,
  };
}

export interface ImportRow {
  row: number;
  name: string;
  phone: string;
  unit: string;
  rent: string;
  deposit: string;
  start: string;
  kind: 'ok' | 'warn' | 'error';
  detail: string;
}

export const IMPORT_ROWS: ImportRow[] = [
  {
    row: 2,
    name: 'Peter Otieno',
    phone: '0712 ••• 512',
    unit: 'B-12',
    rent: '14,000',
    deposit: '28,000',
    start: '01/03/2025',
    kind: 'ok',
    detail: 'Ready',
  },
  {
    row: 3,
    name: 'Mercy Achieng',
    phone: '0722 ••• 304',
    unit: 'C-02',
    rent: '17,500',
    deposit: '35,000',
    start: '15/06/2024',
    kind: 'ok',
    detail: 'Ready',
  },
  {
    row: 9,
    name: 'Amina Hassan',
    phone: '712 ••• 887',
    unit: 'M-03',
    rent: '8,000',
    deposit: '16,000',
    start: '01/09/2025',
    kind: 'warn',
    detail: 'Phone not E.164, fixed automatically to +254712 ••• 887',
  },
  {
    row: 14,
    name: 'Grace Wambui',
    phone: '0733 ••• 041',
    unit: 'A-04',
    rent: '23,500',
    deposit: '47,000',
    start: '01/01/2026',
    kind: 'ok',
    detail: 'Ready',
  },
  {
    row: 27,
    name: 'Kevin Mutua',
    phone: '254701 ••• 956',
    unit: 'R-21',
    rent: '9,500',
    deposit: '9,500',
    start: '1 Feb 2026',
    kind: 'warn',
    detail: 'Phone not E.164, fixed automatically. Date read as 01/02/2026',
  },
  {
    row: 41,
    name: 'Faith Njeri',
    phone: '0745 ••• 220',
    unit: 'A-11',
    rent: '12,000',
    deposit: '24,000',
    start: '01/11/2025',
    kind: 'ok',
    detail: 'Ready',
  },
  {
    row: 58,
    name: 'Samuel Kiprono',
    phone: '0711 ••• 663',
    unit: 'C-40',
    rent: '13,500',
    deposit: '27,000',
    start: '01/05/2026',
    kind: 'error',
    detail: 'Unit C-40 does not exist. Add the unit or fix the code',
  },
  {
    row: 73,
    name: 'Njoki Kamau',
    phone: '0728 ••• 109',
    unit: 'B-07',
    rent: '14,500',
    deposit: '29,000',
    start: '01/08/2025',
    kind: 'ok',
    detail: 'Ready',
  },
];
