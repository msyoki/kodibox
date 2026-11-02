import type { ReactNode } from 'react';
import { TabBar } from '@/components/mobile/tab-bar';
import { TenantLocalProvider } from '@/components/tenant-app/local-state';

const TABS = [
  { label: 'Home', href: '/m/tenant' },
  { label: 'Payments', href: '/m/tenant/statement' },
  { label: 'Requests', href: '/m/tenant/tickets' },
  { label: 'Profile', href: '/m/tenant/profile' },
];

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <TenantLocalProvider>
      <main className="flex flex-1 flex-col">{children}</main>
      <TabBar tabs={TABS} label="Tenant" />
    </TenantLocalProvider>
  );
}
