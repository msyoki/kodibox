'use client';

import Link from 'next/link';
import { Logo } from './logo';
import { OrgSwitcher } from './org-switcher';
import { SidebarNav } from './sidebar-nav';

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-2 text-white no-underline"
      >
        <Logo size={28} />
        <span className="text-xl font-extrabold tracking-tight">Kodibox</span>
      </Link>
      <OrgSwitcher />
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto rounded-xl bg-brand-dark p-3.5 text-[13px] leading-snug text-on-brand">
        <strong className="mb-1 block text-white">Your money, your paybill</strong>
        Rent goes straight to your M-Pesa paybill or bank account. Kodibox only reconciles it.
      </div>
    </div>
  );
}
