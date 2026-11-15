/**
 * Deterministic demo dataset (seeded PRNG, so totals never change between reloads).
 * Calibrated to docs/design/SCREEN_SPEC.md: Mwangi Properties, 150 units, 4 properties,
 * expected KES 1,284,000 / collected KES 1,032,500 for November 2026.
 */
import type {
  AuditEvent,
  DemoData,
  Expense,
  Invoice,
  InvoiceLine,
  Landlord,
  Lease,
  MeterReading,
  Notice,
  Payment,
  PaymentChannel,
  Property,
  Tenant,
  Ticket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  Unit,
  UnmatchedPayment,
} from './raw-types';

/** Whole shillings to integer cents. The calibration maths below runs on safe integers. */
const kes = (shillings: number): number => Math.round(shillings * 100);

export const DEMO_TODAY = '2026-11-02';
export const DEMO_ORG_ID = 'org_mwangi';

const ts = (day: number, time: string, month = 11) =>
  `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${time}:00+03:00`;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261102);
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)] as T;
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}
const pad2 = (n: number) => String(n).padStart(2, '0');
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const letter = () => LETTERS[int(0, LETTERS.length - 1)] as string;
const mpesaCode = () =>
  `TK${int(1, 2)}${letter()}${int(0, 9)}${letter()}${letter()}${int(0, 9)}${letter()}${letter()}`;
/** Obviously fake: every demo number sits in the +254700 0xx xxx block. */
const phone = () => `+254700${String(int(0, 999999)).padStart(6, '0')}`;
/** Obviously fake: demo IDs start with 000. */
const idNumber = () => `000${String(int(10000, 99999))}`;

const FIRST = [
  'Peter',
  'Mercy',
  'Amina',
  'Grace',
  'Kevin',
  'Faith',
  'John',
  'Esther',
  'Brian',
  'Lucy',
  'Samuel',
  'Joyce',
  'David',
  'Ann',
  'James',
  'Mary',
  'Hassan',
  'Fatuma',
  'Collins',
  'Naomi',
  'Victor',
  'Purity',
  'Dennis',
  'Rose',
  'Stephen',
  'Caroline',
  'Felix',
  'Beatrice',
  'Isaac',
  'Winnie',
  'Martin',
  'Sharon',
  'Eric',
  'Lilian',
  'Paul',
  'Agnes',
  'Tom',
  'Judith',
  'Allan',
  'Cynthia',
];
const LAST = [
  'Otieno',
  'Achieng',
  'Hassan',
  'Wambui',
  'Mutua',
  'Njeri',
  'Kamau',
  'Wanjiku',
  'Odhiambo',
  'Atieno',
  'Kiprop',
  'Chebet',
  'Mwangi',
  'Wafula',
  'Omondi',
  'Nyambura',
  'Mohamed',
  'Ali',
  'Kariuki',
  'Muthoni',
  'Maina',
  'Akinyi',
  'Kimani',
  'Naliaka',
  'Ochieng',
  'Wekesa',
  'Barasa',
  'Cheruiyot',
  'Ndungu',
  'Mbugua',
  'Karanja',
  'Musyoka',
  'Mumo',
  'Nduta',
  'Juma',
  'Salim',
  'Anyango',
  'Koech',
  'Lagat',
];

// ---- property blueprint -------------------------------------------------------------------

interface PropSpec {
  id: string;
  name: string;
  area: string;
  kind: 'residential' | 'commercial';
  landlordId: string;
  caretaker: string;
  blocks: [string, number][];
  vacant: string[];
  expected: number;
  collected: number;
  service: number;
  types: [string, number][];
}

const PROPS: PropSpec[] = [
  {
    id: 'prop_riverside',
    name: 'Riverside Court',
    area: 'Kilimani, Nairobi',
    kind: 'residential',
    landlordId: 'll_kamau',
    caretaker: 'Moses Kariuki',
    blocks: [
      ['A', 16],
      ['B', 16],
      ['C', 16],
    ],
    vacant: ['A-13', 'C-09'],
    expected: 552000,
    collected: 498300,
    service: 1300,
    types: [
      ['1BR', 9000],
      ['2BR', 12000],
      ['2BR', 12000],
      ['3BR', 16000],
    ],
  },
  {
    id: 'prop_baraka',
    name: 'Baraka Flats',
    area: 'Ruaka, Kiambu',
    kind: 'residential',
    landlordId: 'll_wafula',
    caretaker: 'Otieno Ouma',
    blocks: [['R', 36]],
    vacant: ['R-14', 'R-33'],
    expected: 306000,
    collected: 238700,
    service: 1000,
    types: [
      ['Bedsitter', 6500],
      ['1BR', 8500],
      ['2BR', 11000],
    ],
  },
  {
    id: 'prop_mvule',
    name: 'Mvule Apartments',
    area: 'Nyali, Mombasa',
    kind: 'residential',
    landlordId: 'll_mwinyi',
    caretaker: 'Otieno Ouma',
    blocks: [['M', 42]],
    vacant: ['M-08', 'M-21', 'M-37'],
    expected: 336000,
    collected: 245500,
    service: 1200,
    types: [
      ['Bedsitter', 6000],
      ['1BR', 8000],
      ['2BR', 10500],
    ],
  },
  {
    id: 'prop_tumaini',
    name: 'Tumaini Shops',
    area: 'Thika Road, Nairobi',
    kind: 'commercial',
    landlordId: 'll_kamau_sons',
    caretaker: 'Joseph Mburu',
    blocks: [['S', 24]],
    vacant: ['S-17'],
    expected: 90000,
    collected: 50000,
    service: 0,
    types: [
      ['Shop (small)', 3000],
      ['Shop (medium)', 4000],
      ['Shop (large)', 5500],
    ],
  },
];

interface Pin {
  name: string;
  total: number;
  water: number;
  /** extra late fee line */
  lateFee?: number;
  paid: boolean;
}

/** Characters from the design frames. Totals are fixed and excluded from calibration. */
const PINS: Record<string, Pin> = {
  'B-12': { name: 'Peter Otieno', total: 16700, water: 1200, lateFee: 200, paid: false },
  'C-02': { name: 'Mercy Achieng', total: 17500, water: 1200, paid: true },
  'A-04': { name: 'Grace Wambui', total: 23500, water: 1200, paid: true },
  'A-11': { name: 'Faith Njeri', total: 12000, water: 1200, paid: true },
  'M-03': { name: 'Amina Hassan', total: 8000, water: 800, paid: true },
  'R-21': { name: 'Kevin Mutua', total: 9500, water: 1000, paid: false },
};

/** Unpaid invoices that have a caretaker-recorded cash payment waiting for approval. */
const CASH_PENDING = ['R-21', 'R-05', 'R-30'];
const NOTICE_UNITS = ['R-09', 'M-15'];
const LEASE_ENDING = { 'A-07': '2026-11-20', 'S-03': '2026-11-28' } as Record<string, string>;
const PAYER_UNMATCHED_RESERVED = ['B-12'];

const usedNames = new Set(Object.values(PINS).map((p) => p.name));
function freshName(): string {
  for (let i = 0; i < 500; i++) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
  return `Tenant ${usedNames.size}`;
}

// ---- build --------------------------------------------------------------------------------

function build(): DemoData {
  const properties: Property[] = [];
  const units: Unit[] = [];
  const tenants: Tenant[] = [];
  const leases: Lease[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];

  const specOf: Record<string, PropSpec> = {};

  for (const spec of PROPS) {
    properties.push({
      id: spec.id,
      orgId: DEMO_ORG_ID,
      name: spec.name,
      area: spec.area,
      kind: spec.kind,
      landlordId: spec.landlordId,
      caretaker: spec.caretaker,
    });

    // units
    const propUnits: Unit[] = [];
    for (const [prefix, count] of spec.blocks) {
      for (let i = 1; i <= count; i++) {
        const code = `${prefix}-${pad2(i)}`;
        const [type, base] = pick(spec.types);
        const vacant = spec.vacant.includes(code);
        propUnits.push({
          id: `u_${code}`,
          propertyId: spec.id,
          code,
          type,
          rent: kes(base),
          serviceCharge: kes(spec.service),
          status: vacant ? 'vacant' : NOTICE_UNITS.includes(code) ? 'notice' : 'occupied',
        });
      }
    }

    // calibrate November invoice totals to the spec's expected figure
    const occupied = propUnits.filter((u) => u.status !== 'vacant');
    const free = occupied.filter((u) => !PINS[u.code]);
    const pinnedTotal = occupied.reduce((s, u) => s + (PINS[u.code]?.total ?? 0), 0);
    const waters: Record<string, number> = {};
    for (const u of free) waters[u.code] = spec.kind === 'commercial' ? 0 : int(6, 18) * 100;
    const others = free.reduce((s, u) => s + spec.service + (waters[u.code] ?? 0), 0);
    const targetRent = spec.expected - pinnedTotal - others;
    const baseSum = free.reduce((s, u) => s + u.rent / 100, 0);
    const factor = targetRent / baseSum;
    const rents: Record<string, number> = {};
    let rentSum = 0;
    for (const u of free) {
      const r = Math.max(2500, Math.round(((u.rent / 100) * factor) / 500) * 500);
      rents[u.code] = r;
      rentSum += r;
    }
    const lastFree = free[free.length - 1];
    if (lastFree) rents[lastFree.code] = (rents[lastFree.code] ?? 0) + (targetRent - rentSum);

    specOf[spec.id] = spec;

    // tenants, leases, invoices
    for (const u of propUnits) {
      units.push(u);
      if (u.status === 'vacant') continue;
      const pin = PINS[u.code];
      const name = pin?.name ?? freshName();
      const tenantId = `ten_${u.code}`;
      const leaseId = `lease_${u.code}`;
      const rent = pin
        ? pin.total - spec.service - pin.water - (pin.lateFee ?? 0)
        : (rents[u.code] ?? 0);
      u.rent = kes(rent);
      u.tenantId = tenantId;

      const start = `${int(2024, 2026)}-${pad2(int(1, 10))}-01`;
      const endsSoon = LEASE_ENDING[u.code];
      tenants.push({
        id: tenantId,
        orgId: DEMO_ORG_ID,
        name,
        unitId: u.id,
        propertyId: spec.id,
        phone: phone(),
        nationalId: idNumber(),
        email: rand() < 0.6 ? `${name.toLowerCase().replace(/\s+/g, '.')}@example.com` : undefined,
        leaseId,
        smsOptOut: rand() < 0.04,
      });
      leases.push({
        id: leaseId,
        tenantId,
        unitId: u.id,
        startDate: start,
        endDate:
          endsSoon ??
          `${Number(start.slice(0, 4)) + 1 + (rand() < 0.5 ? 1 : 0)}-${start.slice(5, 7)}-28`,
        rent: kes(rent),
        deposit: kes(rent * (spec.kind === 'commercial' ? 2 : 1)),
        status: u.status === 'notice' ? 'notice' : endsSoon ? 'ending_soon' : 'active',
      });

      const lines: InvoiceLine[] = [{ kind: 'rent', label: 'Rent', amount: kes(rent) }];
      if (spec.service > 0)
        lines.push({ kind: 'service', label: 'Service charge', amount: kes(spec.service) });
      const water = pin ? pin.water : (waters[u.code] ?? 0);
      if (water > 0) lines.push({ kind: 'water', label: 'Water', amount: kes(water) });
      if (pin?.lateFee)
        lines.push({ kind: 'late_fee', label: 'Late fee (October)', amount: kes(pin.lateFee) });
      const total = lines.reduce((s, l) => s + l.amount, 0);
      invoices.push({
        id: `inv_2026-11_${u.code}`,
        number: `INV-2611-${u.code}`,
        tenantId,
        unitId: u.id,
        propertyId: spec.id,
        period: '2026-11',
        issueDate: '2026-11-01',
        dueDate: '2026-11-05',
        lines,
        total,
        paid: 0,
        balance: total,
        status: 'unpaid',
        oldestUnpaidDays: 0,
      });
    }
  }

  // ---- collections: hit each property's collected figure exactly --------------------------
  const settle = (inv: Invoice, amount: number) => {
    inv.paid = amount;
    inv.balance = inv.total - amount;
    inv.status = inv.balance === 0 ? 'paid' : 'partial';
  };

  for (const spec of PROPS) {
    const propInvoices = invoices.filter((i) => i.propertyId === spec.id);
    const codeOf = (i: Invoice) => i.unitId.slice(2);
    let paidSoFar = 0;
    for (const inv of propInvoices) {
      const pin = PINS[codeOf(inv)];
      if (pin?.paid) {
        settle(inv, inv.total);
        paidSoFar += inv.total;
      }
    }
    const target = kes(spec.collected);
    const candidates = shuffle(
      propInvoices.filter((i) => !PINS[codeOf(i)] && !CASH_PENDING.includes(codeOf(i))),
    );
    for (const inv of candidates) {
      if (paidSoFar + inv.total <= target) {
        settle(inv, inv.total);
        paidSoFar += inv.total;
      }
    }
    const residual = target - paidSoFar;
    if (residual > 0) {
      const partial = candidates.find((i) => i.paid === 0 && i.total > residual);
      if (partial) settle(partial, residual);
    }
  }

  // ---- arrears aging buckets (31-60, 61-90, 90+ targets from the dashboard frame) --------
  const protectedCodes = new Set([...CASH_PENDING, ...PAYER_UNMATCHED_RESERVED]);
  const open = invoices.filter((i) => i.balance > 0);
  const eligible = open
    .filter((i) => !protectedCodes.has(i.unitId.slice(2)))
    .sort((a, b) => b.balance - a.balance);
  const buckets: { target: number; min: number; max: number }[] = [
    { target: kes(18000), min: 91, max: 130 },
    { target: kes(30000), min: 61, max: 90 },
    { target: kes(61500), min: 31, max: 60 },
  ];
  const assigned = new Set<string>();
  for (const b of buckets) {
    let remaining = b.target;
    for (const inv of eligible) {
      if (assigned.has(inv.id) || inv.balance > remaining) continue;
      inv.oldestUnpaidDays = int(b.min, b.max);
      assigned.add(inv.id);
      remaining -= inv.balance;
    }
  }
  for (const inv of open) {
    if (!assigned.has(inv.id))
      inv.oldestUnpaidDays = protectedCodes.has(inv.unitId.slice(2)) ? 0 : int(0, 30);
    if (inv.status !== 'partial') inv.status = inv.oldestUnpaidDays > 0 ? 'overdue' : 'unpaid';
  }

  // ---- payments --------------------------------------------------------------------------
  const unitOf = (id: string) => units.find((u) => u.id === id) as Unit;
  const pinnedPayment: Record<string, { channel: PaymentChannel; ref: string; at: string }> = {
    'C-02': { channel: 'mpesa_stk', ref: 'TK2H8L3M9P', at: ts(2, '09:42') },
    'M-03': { channel: 'mpesa_paybill', ref: 'TK2G1QW7ZA', at: ts(2, '09:15') },
    'A-04': { channel: 'bank', ref: 'EQ-55102931', at: ts(2, '08:31') },
    'A-11': { channel: 'mpesa_paybill', ref: 'TK1Z0PL2CX', at: ts(1, '17:05') },
  };
  let seq = 1;
  for (const inv of invoices) {
    if (inv.paid === 0) continue;
    const code = inv.unitId.slice(2);
    const pin = pinnedPayment[code];
    const channel: PaymentChannel =
      pin?.channel ??
      pick<PaymentChannel>([
        'mpesa_paybill',
        'mpesa_paybill',
        'mpesa_paybill',
        'mpesa_stk',
        'bank',
      ]);
    payments.push({
      id: `pay_${String(seq++).padStart(4, '0')}`,
      tenantId: inv.tenantId,
      unitId: inv.unitId,
      propertyId: inv.propertyId,
      invoiceId: inv.id,
      amount: inv.paid,
      channel,
      reference: pin?.ref ?? (channel === 'bank' ? `EQ-${int(55000000, 55099999)}` : mpesaCode()),
      receivedAt: pin?.at ?? ts(int(1, 2), `${pad2(int(6, 8))}:${pad2(int(0, 59))}`),
      status: 'matched',
    });
  }
  const cashMeta: Record<string, { receipt: string; at: string }> = {
    'R-21': { receipt: 'Receipt #1043', at: ts(2, '07:50') },
    'R-05': { receipt: 'Receipt #1042', at: ts(1, '16:20') },
    'R-30': { receipt: 'Receipt #1041', at: ts(1, '11:05') },
  };
  for (const code of CASH_PENDING) {
    const inv = invoices.find((i) => i.unitId === `u_${code}`) as Invoice;
    const meta = cashMeta[code] as { receipt: string; at: string };
    payments.push({
      id: `pay_${String(seq++).padStart(4, '0')}`,
      tenantId: inv.tenantId,
      unitId: inv.unitId,
      propertyId: inv.propertyId,
      invoiceId: inv.id,
      amount: inv.total,
      channel: 'cash',
      reference: meta.receipt,
      receivedAt: meta.at,
      status: 'awaiting_approval',
      recordedBy: 'Otieno Ouma',
    });
  }
  payments.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  // ---- unmatched M-Pesa payments: 6 totalling KES 74,200 ---------------------------------
  const peter = invoices.find((i) => i.unitId === 'u_B-12') as Invoice;
  const unmatchedRows: [string, number, string, string, string][] = [
    ['TK2F9RT4KD', 15000, 'Unknown payer', 'B12 ', ts(2, '08:58')],
    ['TK2E4NB6QW', 12500, 'Jane M Kamau', 'RIVERSIDE', ts(2, '07:12')],
    ['TK2D7XC1HF', 9700, 'Charles Oduor', '', ts(1, '19:44')],
    ['TK2C2MV8LP', 18000, 'Hannah Ruto', 'M 14', ts(1, '15:30')],
    ['TK2B5ZQ3RT', 8000, 'Peter Kibet', '0722', ts(1, '12:18')],
    ['TK2A9KD6YU', 11000, 'Lydia Nasimiyu', 'S3', ts(1, '09:02')],
  ];
  const unmatched: UnmatchedPayment[] = unmatchedRows.map(
    ([reference, amount, payerName, accountEntered, receivedAt], idx) => {
      const suggestionUnit = ['B-12', 'C-02', 'M-14', 'M-14', 'R-05', 'S-03'][idx] as string;
      const inv =
        suggestionUnit === 'B-12'
          ? peter
          : (invoices.find((i) => i.unitId === `u_${suggestionUnit}`) as Invoice);
      return {
        id: `um_${idx + 1}`,
        reference,
        amount: kes(amount),
        payerName,
        payerPhone: phone(),
        accountEntered,
        channel: 'mpesa_paybill',
        receivedAt,
        suggestions: [
          {
            tenantId: inv.tenantId,
            invoiceId: inv.id,
            reason:
              idx === 0
                ? 'Account "B12" looks like unit B-12'
                : idx === 4
                  ? 'Amount matches open balance'
                  : 'Closest match on account text',
          },
        ],
      };
    },
  );

  // ---- tickets ---------------------------------------------------------------------------
  type TRow = [
    string,
    string,
    string,
    Ticket['category'],
    TicketPriority,
    TicketStatus,
    string | undefined,
    string,
  ];
  const ticketRows: TRow[] = [
    [
      'B-12',
      'Kitchen sink is leaking',
      'Water drips under the sink and the cabinet floor is wet.',
      'plumbing',
      'high',
      'in_progress',
      'Moses Kariuki',
      ts(30, '08:20', 10),
    ],
    [
      'A-07',
      'No hot water in the shower',
      'Heater tripped and will not stay on.',
      'electrical',
      'normal',
      'assigned',
      'Moses Kariuki',
      ts(31, '18:05', 10),
    ],
    [
      'R-22',
      'Gate lock is broken',
      'The main gate does not lock at night.',
      'security',
      'urgent',
      'new',
      undefined,
      ts(2, '06:40'),
    ],
    [
      'M-12',
      'Low water pressure',
      'Pressure drops every evening on the 2nd floor.',
      'water',
      'normal',
      'in_progress',
      'Otieno Ouma',
      ts(29, '19:15', 10),
    ],
    [
      'C-14',
      'Ceiling stain after rain',
      'Brown patch is spreading above the bedroom window.',
      'structural',
      'high',
      'assigned',
      'Moses Kariuki',
      ts(1, '10:30'),
    ],
    [
      'S-09',
      'Shop shutter jammed',
      'Cannot open the shutter fully in the morning.',
      'structural',
      'normal',
      'new',
      undefined,
      ts(2, '07:55'),
    ],
    [
      'R-05',
      'Socket sparks when used',
      'Left socket in the living room sparks.',
      'electrical',
      'urgent',
      'new',
      undefined,
      ts(2, '08:10'),
    ],
    [
      'M-25',
      'Stairwell light out',
      'Third floor stairwell has been dark for 3 days.',
      'electrical',
      'low',
      'assigned',
      'Otieno Ouma',
      ts(30, '20:00', 10),
    ],
    [
      'B-05',
      'Blocked bathroom drain',
      'Water drains very slowly.',
      'plumbing',
      'normal',
      'in_progress',
      'Moses Kariuki',
      ts(28, '09:00', 10),
    ],
    [
      'C-02',
      'Window latch replaced',
      'Latch replaced and tested.',
      'other',
      'low',
      'resolved',
      'Moses Kariuki',
      ts(24, '12:00', 10),
    ],
    [
      'A-04',
      'Water meter not reading',
      'Meter display was blank.',
      'water',
      'normal',
      'resolved',
      'Moses Kariuki',
      ts(22, '09:40', 10),
    ],
    [
      'R-30',
      'Neighbour noise after 11pm',
      'Repeated loud music on weekends.',
      'other',
      'low',
      'resolved',
      'Otieno Ouma',
      ts(20, '21:15', 10),
    ],
    [
      'M-03',
      'Door handle loose',
      'Fixed with new screws.',
      'other',
      'low',
      'resolved',
      'Otieno Ouma',
      ts(18, '14:00', 10),
    ],
    [
      'B-08',
      'Broken tap in kitchen',
      'Replaced the mixer tap.',
      'plumbing',
      'normal',
      'resolved',
      'Moses Kariuki',
      ts(15, '10:10', 10),
    ],
    [
      'S-03',
      'Power outage in shop',
      'Prepaid token issue, resolved with KPLC.',
      'electrical',
      'normal',
      'closed',
      'Joseph Mburu',
      ts(10, '11:00', 10),
    ],
    [
      'R-21',
      'Leaking roof over balcony',
      'Sealed by contractor.',
      'structural',
      'high',
      'closed',
      'Otieno Ouma',
      ts(5, '08:30', 10),
    ],
  ];
  const tickets: Ticket[] = [];
  const ticketMessages: TicketMessage[] = [];
  ticketRows.forEach(
    ([code, title, desc, category, priority, status, assignee, createdAt], idx) => {
      const u = unitOf(`u_${code}`);
      const tenant = tenants.find((t) => t.unitId === u.id) as Tenant;
      const id = `tk_${idx + 1}`;
      const updatedAt = status === 'new' ? createdAt : ts(2, '08:00');
      tickets.push({
        id,
        number: `T-${1040 + idx}`,
        propertyId: u.propertyId,
        unitId: u.id,
        tenantId: tenant.id,
        title,
        category,
        priority,
        status,
        assignee,
        createdAt,
        updatedAt,
      });
      ticketMessages.push({
        id: `${id}_m1`,
        ticketId: id,
        author: tenant.name,
        role: 'tenant',
        body: desc,
        at: createdAt,
        internal: false,
      });
      if (status !== 'new' && assignee) {
        ticketMessages.push({
          id: `${id}_m2`,
          ticketId: id,
          author: 'Wanjiru Mwangi',
          role: 'manager',
          body: `Assigned to ${assignee}. We will update you shortly.`,
          at: ts(2, '08:00'),
          internal: false,
        });
      }
      if (status === 'resolved' || status === 'closed') {
        ticketMessages.push({
          id: `${id}_m3`,
          ticketId: id,
          author: assignee ?? 'Caretaker',
          role: 'caretaker',
          body: 'Work completed and checked with the tenant.',
          at: ts(2, '09:00'),
          internal: false,
        });
      }
    },
  );

  // ---- expenses --------------------------------------------------------------------------
  const exp = (
    n: number,
    propertyId: string,
    category: Expense['category'],
    description: string,
    vendor: string,
    amount: number,
    date: string,
    status: Expense['status'],
    ticketId?: string,
  ): Expense => ({
    id: `exp_${n}`,
    propertyId,
    category,
    description,
    vendor,
    amount: kes(amount),
    date,
    status,
    ticketId,
  });
  const expenses: Expense[] = [
    exp(
      1,
      'prop_riverside',
      'repairs',
      'Kitchen sink pipe replacement, B-12',
      'Mwenda Plumbers',
      4500,
      '2026-11-01',
      'pending',
      'tk_1',
    ),
    exp(
      2,
      'prop_riverside',
      'cleaning',
      'October cleaning contract',
      'BrightSpace Cleaners',
      18000,
      '2026-10-31',
      'paid',
    ),
    exp(
      3,
      'prop_riverside',
      'security',
      'October guard services',
      'Ulinzi Security',
      42000,
      '2026-10-31',
      'paid',
    ),
    exp(
      4,
      'prop_baraka',
      'repairs',
      'Gate lock replacement',
      'Ruaka Hardware',
      6200,
      '2026-11-02',
      'pending',
      'tk_3',
    ),
    exp(
      5,
      'prop_baraka',
      'utilities',
      'Common area electricity',
      'KPLC',
      9800,
      '2026-10-28',
      'paid',
    ),
    exp(
      6,
      'prop_mvule',
      'utilities',
      'Borehole pump servicing',
      'Coast Pumps Ltd',
      12500,
      '2026-10-27',
      'approved',
    ),
    exp(
      7,
      'prop_mvule',
      'insurance',
      'Annual building insurance, part 1',
      'Jubilee Insurance',
      36000,
      '2026-10-15',
      'paid',
    ),
    exp(
      8,
      'prop_mvule',
      'repairs',
      'Stairwell lighting',
      'Nyali Electricals',
      3400,
      '2026-11-01',
      'pending',
      'tk_8',
    ),
    exp(
      9,
      'prop_tumaini',
      'security',
      'October guard services',
      'Ulinzi Security',
      24000,
      '2026-10-31',
      'paid',
    ),
    exp(
      10,
      'prop_tumaini',
      'repairs',
      'Shutter rail repair, S-09',
      'Thika Road Metalworks',
      7800,
      '2026-11-02',
      'pending',
      'tk_6',
    ),
    exp(
      11,
      'prop_riverside',
      'other',
      'Compound landscaping',
      'Green Thumb',
      5500,
      '2026-10-20',
      'paid',
    ),
    exp(
      12,
      'prop_baraka',
      'cleaning',
      'October cleaning contract',
      'BrightSpace Cleaners',
      11000,
      '2026-10-31',
      'paid',
    ),
  ];

  // ---- meter readings (Mvule: 24 units on meters, 18 recorded; Riverside all approved) ----
  const meterReadings: MeterReading[] = [];
  const mvuleMetered = units
    .filter((u) => u.propertyId === 'prop_mvule' && u.status !== 'vacant')
    .slice(0, 24);
  mvuleMetered.forEach((u, i) => {
    const previous = int(100, 400);
    const done = i < 18;
    meterReadings.push({
      id: `mr_${u.code}`,
      unitId: u.id,
      propertyId: u.propertyId,
      period: '2026-11',
      previous,
      current: done ? previous + int(4, 14) : null,
      ratePerUnit: kes(150),
      recordedBy: done ? 'Otieno Ouma' : undefined,
      status: done ? 'recorded' : 'pending',
    });
  });
  for (const u of units.filter((x) => x.propertyId === 'prop_riverside' && x.status !== 'vacant')) {
    const previous = int(100, 400);
    meterReadings.push({
      id: `mr_${u.code}`,
      unitId: u.id,
      propertyId: u.propertyId,
      period: '2026-11',
      previous,
      current: previous + int(4, 14),
      ratePerUnit: kes(150),
      recordedBy: 'Moses Kariuki',
      status: 'approved',
    });
  }

  // ---- notices ---------------------------------------------------------------------------
  const notices: Notice[] = [
    {
      id: 'nt_1',
      tenantId: 'ten_R-09',
      unitId: 'u_R-09',
      propertyId: 'prop_baraka',
      kind: 'vacate',
      issuedAt: '2026-10-20',
      effectiveDate: '2026-11-30',
      status: 'acknowledged',
    },
    {
      id: 'nt_2',
      tenantId: 'ten_M-15',
      unitId: 'u_M-15',
      propertyId: 'prop_mvule',
      kind: 'vacate',
      issuedAt: '2026-10-28',
      effectiveDate: '2026-12-01',
      status: 'sent',
    },
    {
      id: 'nt_3',
      tenantId: 'ten_A-07',
      unitId: 'u_A-07',
      propertyId: 'prop_riverside',
      kind: 'lease_end',
      issuedAt: '2026-10-15',
      effectiveDate: '2026-11-20',
      status: 'sent',
    },
    {
      id: 'nt_4',
      tenantId: 'ten_S-03',
      unitId: 'u_S-03',
      propertyId: 'prop_tumaini',
      kind: 'lease_end',
      issuedAt: '2026-10-18',
      effectiveDate: '2026-11-28',
      status: 'draft',
    },
  ];

  // ---- landlords & remittances -----------------------------------------------------------
  const landlords: Landlord[] = [
    {
      id: 'll_kamau',
      name: 'Joseph Kamau',
      phone: '+254700100501',
      propertyIds: ['prop_riverside'],
      commissionPct: 8,
      payoutMethod: 'bank',
    },
    {
      id: 'll_wafula',
      name: 'Beatrice Wafula',
      phone: '+254700200612',
      propertyIds: ['prop_baraka'],
      commissionPct: 8,
      payoutMethod: 'mpesa',
    },
    {
      id: 'll_mwinyi',
      name: 'Hassan Ali Mwinyi',
      phone: '+254700300723',
      propertyIds: ['prop_mvule'],
      commissionPct: 7.5,
      payoutMethod: 'bank',
    },
    {
      id: 'll_kamau_sons',
      name: 'Kamau & Sons Ltd',
      phone: '+254700400834',
      propertyIds: ['prop_tumaini'],
      commissionPct: 10,
      payoutMethod: 'bank',
    },
  ];
  const remittances = landlords.flatMap((ll) => {
    const spec = PROPS.find((p) => p.landlordId === ll.id) as PropSpec;
    const spend = expenses
      .filter((e) => e.propertyId === spec.id && e.status === 'paid')
      .reduce((s, e) => s + e.amount, 0);
    const mk = (period: string, gross: number, status: 'due' | 'remitted') => {
      const commission = Math.round((gross * ll.commissionPct) / 100);
      return {
        id: `rem_${ll.id}_${period}`,
        landlordId: ll.id,
        period,
        gross,
        commission,
        expenses: spend,
        net: gross - commission - spend,
        status,
        remittedAt: status === 'remitted' ? ts(5, '10:00') : undefined,
      };
    };
    return [
      mk('2026-10', kes(Math.round((spec.expected * 0.96) / 100) * 100), 'remitted'),
      mk('2026-11', kes(spec.collected), 'due'),
    ];
  });

  const audit = (
    n: number,
    at: string,
    actor: string,
    action: string,
    entity: string,
    summary: string,
  ): AuditEvent => ({ id: `ae_${n}`, at, actor, action, entity, summary });

  return {
    org: {
      id: DEMO_ORG_ID,
      name: 'Mwangi Properties',
      plan: 'growth',
      ownerName: 'Wanjiru Mwangi',
      paybill: '000111',
      smsSenderId: 'MWANGIPROP',
    },
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        priceMonthly: kes(1500),
        unitLimit: 30,
        features: ['Up to 30 units', 'M-Pesa reconciliation', 'Tenant statements'],
      },
      {
        id: 'growth',
        name: 'Growth',
        priceMonthly: kes(4500),
        unitLimit: 200,
        features: [
          'Up to 200 units',
          'Landlord remittances',
          'Tickets and repairs',
          'SMS reminders',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        priceMonthly: kes(9000),
        unitLimit: 1000,
        features: [
          'Up to 1,000 units',
          'Multiple branches',
          'KRA-ready reports',
          'Priority support',
        ],
      },
    ],
    landlords,
    properties,
    units,
    tenants,
    leases,
    invoices,
    payments,
    unmatched,
    tickets,
    ticketMessages,
    expenses,
    meterReadings,
    notices,
    remittances,
    members: [
      {
        id: 'mem_1',
        name: 'Wanjiru Mwangi',
        email: 'wanjiru@example.com',
        role: 'owner',
        twoFactor: true,
        lastActive: ts(2, '08:05'),
      },
      {
        id: 'mem_2',
        name: 'Daniel Kiprop',
        email: 'daniel@example.com',
        role: 'manager',
        twoFactor: true,
        lastActive: ts(2, '07:40'),
      },
      {
        id: 'mem_3',
        name: 'Susan Cheptoo',
        email: 'susan@example.com',
        role: 'accountant',
        twoFactor: true,
        lastActive: ts(1, '16:12'),
      },
      {
        id: 'mem_4',
        name: 'Otieno Ouma',
        email: 'otieno@example.com',
        role: 'caretaker',
        twoFactor: false,
        lastActive: ts(2, '07:52'),
      },
    ],
    auditEvents: [
      audit(
        1,
        ts(2, '08:05'),
        'Wanjiru Mwangi',
        'auth.login',
        'session',
        'Signed in with two-factor',
      ),
      audit(
        2,
        ts(2, '07:50'),
        'Otieno Ouma',
        'payment.cash_recorded',
        'Receipt #1043',
        'Recorded KES 9,500 cash for R-21 (awaiting approval)',
      ),
      audit(3, ts(1, '17:30'), 'System', 'invoice.run', 'November 2026', 'Generated 142 invoices'),
      audit(
        4,
        ts(1, '16:20'),
        'Otieno Ouma',
        'payment.cash_recorded',
        'Receipt #1042',
        'Recorded cash for R-05 (awaiting approval)',
      ),
      audit(
        5,
        ts(1, '11:00'),
        'Daniel Kiprop',
        'lease.updated',
        'Lease A-07',
        'Set end date to 2026-11-20',
      ),
      audit(
        6,
        ts(31, '15:10', 10),
        'Wanjiru Mwangi',
        'settings.updated',
        'Late fee',
        'Changed late fee from KES 150 to KES 200',
      ),
      audit(
        7,
        ts(30, '09:45', 10),
        'Susan Cheptoo',
        'remittance.marked_paid',
        'Joseph Kamau, Oct',
        'Marked October remittance as paid',
      ),
      audit(
        8,
        ts(29, '14:00', 10),
        'Wanjiru Mwangi',
        'member.invited',
        'Susan Cheptoo',
        'Invited as accountant',
      ),
    ],
    templates: [
      {
        id: 'tpl_1',
        name: 'Rent reminder',
        channel: 'sms',
        body: 'Hi {{name}}, your {{month}} rent for {{unit}} is KES {{amount}}, due {{due}}. Pay via M-Pesa Paybill 000111, Account {{unit}}. Reply STOP to opt out of reminders.',
      },
      {
        id: 'tpl_2',
        name: 'Payment receipt',
        channel: 'sms',
        body: 'Received KES {{amount}} for {{unit}}, ref {{ref}}. Thank you. Reply STOP to opt out.',
      },
      {
        id: 'tpl_3',
        name: 'Water reading notice',
        channel: 'sms',
        body: 'Water readings at {{property}} will be taken on {{date}}. Please give access. Reply STOP to opt out.',
      },
      {
        id: 'tpl_4',
        name: 'Maintenance update',
        channel: 'sms',
        body: 'Update on request {{ticket}}: {{status}}. Reply STOP to opt out.',
      },
      {
        id: 'tpl_5',
        name: 'Lease ending',
        channel: 'email',
        body: 'Dear {{name}}, your lease for {{unit}} ends on {{date}}. Please contact the office to renew or arrange your move-out.',
      },
    ],
    messages: [
      {
        id: 'msg_1',
        templateId: 'tpl_1',
        channel: 'sms',
        audience: 'All tenants with a balance',
        recipients: 23,
        body: 'Rent reminder for November',
        sentAt: ts(1, '08:00'),
        status: 'sent',
      },
      {
        id: 'msg_2',
        templateId: 'tpl_3',
        channel: 'sms',
        audience: 'Mvule Apartments',
        recipients: 39,
        body: 'Water reading notice',
        sentAt: ts(31, '09:00', 10),
        status: 'sent',
      },
      {
        id: 'msg_3',
        templateId: 'tpl_5',
        channel: 'email',
        audience: 'Leases ending in 30 days',
        recipients: 2,
        body: 'Lease ending',
        sentAt: ts(30, '10:00', 10),
        status: 'sent',
      },
      {
        id: 'msg_4',
        templateId: 'tpl_1',
        channel: 'sms',
        audience: 'Riverside Court',
        recipients: 46,
        body: 'Rent reminder for November',
        sentAt: ts(4, '08:00', 11),
        status: 'scheduled',
      },
      {
        id: 'msg_5',
        templateId: 'tpl_2',
        channel: 'sms',
        audience: 'Payments received today',
        recipients: 14,
        body: 'Payment receipts',
        sentAt: ts(2, '09:50'),
        status: 'sent',
      },
      {
        id: 'msg_6',
        templateId: 'tpl_4',
        channel: 'sms',
        audience: 'Open tickets',
        recipients: 9,
        body: 'Maintenance update',
        sentAt: ts(29, '16:00', 10),
        status: 'failed',
      },
    ],
    dataRequests: [
      {
        id: 'dr_1',
        tenantId: 'ten_B-12',
        kind: 'export',
        status: 'received',
        receivedAt: '2026-10-30',
        dueAt: '2026-11-29',
      },
      {
        id: 'dr_2',
        tenantId: 'ten_C-02',
        kind: 'correction',
        status: 'in_review',
        receivedAt: '2026-10-22',
        dueAt: '2026-11-21',
      },
      {
        id: 'dr_3',
        tenantId: 'ten_A-04',
        kind: 'export',
        status: 'completed',
        receivedAt: '2026-10-05',
        dueAt: '2026-11-04',
      },
    ],
  };
}

export const rawSeed: DemoData = build();
