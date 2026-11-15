'use client';

import {
  Badge,
  Button,
  Card,
  CardHeader,
  Money,
  Stat,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui';
import { formatDate } from '@/demo/format';
import { getLandlord, getProperty, listExpenses, listRemittances, listTickets } from '@/demo';
import { useDemoStore } from '@/demo/store';

const PORTAL_LANDLORD_ID = 'll_kamau';

const DOCS = [
  { name: 'November statement (draft)', meta: 'PDF · month to date' },
  { name: 'Management agreement', meta: 'PDF · signed 12 Jan 2025' },
  { name: 'Rent roll, 2 Nov 2026', meta: 'PDF · all units' },
  { name: 'MRI summary, October', meta: 'PDF · figures only, file on iTax yourself' },
];

const monthName = (period: string) => {
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const [y, m] = period.split('-');
  return `${names[Number(m) - 1]} ${y}`;
};

export function PortalView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const landlord = getLandlord(PORTAL_LANDLORD_ID, data);
  if (!landlord) return null;

  const props = landlord.propertyIds
    .map((id) => getProperty(id, data))
    .flatMap((p) => (p ? [p] : []));
  const expected = props.reduce((s, p) => s + p.expected, 0);
  const collected = props.reduce((s, p) => s + p.collected, 0);
  const units = props.reduce((s, p) => s + p.unitCount, 0);
  const occupied = props.reduce((s, p) => s + p.occupied, 0);
  const remittances = listRemittances(landlord.id, data).sort((a, b) =>
    b.period.localeCompare(a.period),
  );
  const next = remittances.find((r) => r.status === 'due');
  const history = remittances.filter((r) => r.status === 'remitted');
  const expenses = props.flatMap((p) => listExpenses(p.id, data));
  const maintenanceCost = expenses.reduce((s, e) => s + e.amount, 0);
  const jobs = props.flatMap((p) =>
    listTickets({ propertyId: p.id }, data).filter(
      (t) => t.status !== 'resolved' && t.status !== 'closed',
    ),
  );

  const download = (name: string) => () =>
    toast(`Download started: ${name}. Logged for audit.`, 'ok');

  return (
    <div className="flex flex-col gap-6">
      <section id="overview" className="flex flex-col gap-4 scroll-mt-4">
        <p
          role="note"
          className="m-0 flex flex-wrap items-center gap-2.5 rounded-control bg-info-soft px-3.5 py-2.5 text-sm text-info"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>
            <strong>Read-only view.</strong> You can see and download your records here. To change
            anything, contact Mwangi Properties.
          </span>
        </p>
        <div>
          <h1 className="m-0 text-[28px] font-extrabold tracking-tight">
            Karibu, {landlord.name.split(' ')[0]}
          </h1>
          <p className="m-0 mt-1 text-sm text-muted">
            {props.map((p) => `${p.name}, ${p.area}`).join(' · ')} · {units} units · November 2026,
            updated 2 Nov 09:45
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Collected this month"
            value={<Money minor={collected} />}
            progress={{
              value: expected ? Math.round((collected / expected) * 100) : 0,
              tone: 'brand',
            }}
            sub={
              <>
                of <Money minor={expected} /> expected
              </>
            }
          />
          <Stat
            label="Still to collect"
            value={<Money minor={expected - collected} />}
            sub="Tenants with a balance"
            progress={{
              value: expected ? Math.round(((expected - collected) / expected) * 100) : 0,
              tone: 'warning',
            }}
          />
          <Stat
            label="Occupancy"
            value={`${units ? ((occupied / units) * 100).toFixed(1) : 0}%`}
            sub={`${occupied} of ${units} occupied · ${units - occupied} vacant`}
            progress={{ value: units ? (occupied / units) * 100 : 0 }}
          />
          <Stat
            highlight
            label="Next remittance (est.)"
            value={next ? <Money minor={next.gross - next.commission - next.expenses} /> : '-'}
            sub={`After ${landlord.commissionPct}% commission and approved expenses, by 5 Dec`}
          />
        </div>
      </section>

      <Card id="properties" aria-labelledby="props-h" className="scroll-mt-4">
        <CardHeader title="Your properties" id="props-h" />
        <Table minWidth={520}>
          <THead>
            <TR>
              <TH>Property</TH>
              <TH align="right">Units</TH>
              <TH align="right">Occupied</TH>
              <TH align="right">Collected</TH>
              <TH align="right">Expected</TH>
            </TR>
          </THead>
          <TBody>
            {props.map((p) => (
              <TR key={p.id}>
                <TD className="font-semibold">
                  {p.name}
                  <div className="text-xs font-normal text-muted">{p.area}</div>
                </TD>
                <TD align="right">{p.unitCount}</TD>
                <TD align="right">
                  {p.occupied} of {p.unitCount}
                </TD>
                <TD align="right">
                  <Money minor={p.collected} />
                </TD>
                <TD align="right">
                  <Money minor={p.expected} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card id="remittances" aria-labelledby="rem-h" className="scroll-mt-4">
        <CardHeader title="Remittance history" id="rem-h" />
        {history.length === 0 ? (
          <p className="m-0 text-sm text-muted">No remittances yet.</p>
        ) : (
          <Table minWidth={480}>
            <THead>
              <TR>
                <TH>Month</TH>
                <TH align="right">Paid to you</TH>
                <TH>Statement</TH>
              </TR>
            </THead>
            <TBody>
              {history.map((h) => (
                <TR key={h.id}>
                  <TD>
                    {monthName(h.period)}
                    {h.remittedAt ? (
                      <div className="text-xs text-muted">Paid {formatDate(h.remittedAt)}</div>
                    ) : null}
                  </TD>
                  <TD align="right">
                    <Money minor={h.gross - h.commission - h.expenses} />
                  </TD>
                  <TD>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={download(`statement ${monthName(h.period)}`)}
                    >
                      PDF<span className="sr-only"> statement for {monthName(h.period)}</span>
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card id="maintenance" aria-labelledby="maint-h" className="scroll-mt-4">
        <CardHeader title="Maintenance" id="maint-h" />
        <p className="mt-0 text-sm text-muted">
          Costs above KES 10,000 are shown for your information. Repair spend recorded this period:{' '}
          <Money minor={maintenanceCost} />.
        </p>
        <Table minWidth={480}>
          <THead>
            <TR>
              <TH>Job</TH>
              <TH>Unit</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {jobs.slice(0, 6).map((t) => (
              <TR key={t.id}>
                <TD>{t.title}</TD>
                <TD>{t.unitCode}</TD>
                <TD>
                  <Badge tone={t.priority === 'urgent' || t.priority === 'high' ? 'warn' : 'info'}>
                    {t.status.replace('_', ' ')}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card id="documents" aria-labelledby="docs-h" className="scroll-mt-4">
        <CardHeader title="Documents" id="docs-h" />
        <ul className="m-0 list-none p-0">
          {DOCS.map((d) => (
            <li
              key={d.name}
              className="flex items-center justify-between gap-3 border-t border-divider py-2 first:border-t-0"
            >
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs text-muted">{d.meta}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={download(d.name)}>
                Download<span className="sr-only"> {d.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <p className="m-0 text-xs text-muted">
        Kodibox never holds rent money. Tenants pay directly to the paybill or account of this
        property; Mwangi Properties remits your share. Tenant details are masked here in line with
        the privacy notice.
      </p>
    </div>
  );
}
