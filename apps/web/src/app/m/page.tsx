import Link from 'next/link';
import { Logo } from '@/components/shell/logo';

const PERSONAS = [
  {
    href: '/m/tenant',
    name: 'Tenant',
    who: 'Peter Otieno, B-12 Riverside Court',
    blurb: 'Balance, how to pay, proof of payment, statements, repair requests.',
  },
  {
    href: '/m/caretaker',
    name: 'Caretaker',
    who: 'Otieno Ouma, Baraka Flats and Mvule',
    blurb: 'Tasks, meter readings, cash collection, jobs.',
  },
  {
    href: '/m/manager',
    name: 'Manager',
    who: 'Wanjiru Mwangi, Mwangi Properties',
    blurb: 'Approvals, tenants and alerts on the go.',
  },
];

export default function MobileIndexPage() {
  return (
    <main className="flex flex-1 flex-col gap-5 p-5">
      <div className="flex items-center gap-2.5 pt-4">
        <Logo size={30} tone="dark" />
        <span className="text-2xl font-extrabold tracking-tight">Kodibox mobile</span>
      </div>
      <p className="m-0 text-sm text-muted">
        Pick a persona to preview the phone experience. Demo mode &mdash; sample data.
      </p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {PERSONAS.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="flex min-h-14 flex-col gap-1 rounded-card border border-border bg-surface p-4 text-text no-underline hover:border-brand focus-visible:outline-2 focus-visible:outline-link"
            >
              <strong className="text-lg">{p.name}</strong>
              <span className="text-sm font-semibold text-link">{p.who}</span>
              <span className="text-sm text-muted">{p.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/dashboard" className="mt-auto min-h-11 py-3 text-center text-sm font-semibold">
        Back to the web app
      </Link>
    </main>
  );
}
