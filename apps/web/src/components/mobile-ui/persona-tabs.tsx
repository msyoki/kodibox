'use client';

import { TabBar } from '@/components/mobile/tab-bar';
import { useDemoStore } from '@/demo/store';

export function CaretakerTabs() {
  return (
    <TabBar
      label="Caretaker"
      tabs={[
        { label: 'Tasks', href: '/m/caretaker' },
        { label: 'Readings', href: '/m/caretaker/readings' },
        { label: 'Cash', href: '/m/caretaker/cash' },
        { label: 'Jobs', href: '/m/caretaker/jobs' },
      ]}
    />
  );
}

export function ManagerTabs() {
  const { badges } = useDemoStore();
  return (
    <TabBar
      label="Manager"
      tabs={[
        { label: 'Home', href: '/m/manager' },
        {
          label: 'Approvals',
          href: '/m/manager/approvals',
          badge: badges.cashPending + badges.unmatched,
        },
        { label: 'Tenants', href: '/m/manager/tenants' },
        { label: 'Alerts', href: '/m/manager/alerts' },
      ]}
    />
  );
}
