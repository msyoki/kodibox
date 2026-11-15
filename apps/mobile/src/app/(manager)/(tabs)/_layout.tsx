import { RoleTabs } from '@/components/role-layout';
import { usePendingCounts } from '@/state/demo-state';

export default function ManagerTabs() {
  const waiting = usePendingCounts().total;
  return (
    <RoleTabs
      tabs={[
        { name: 'overview', title: 'Home', icon: 'home-outline', iconActive: 'home' },
        {
          name: 'approvals',
          title: 'Approvals',
          icon: 'checkmark-circle-outline',
          iconActive: 'checkmark-circle',
          badge: waiting,
        },
        { name: 'tenants', title: 'Tenants', icon: 'people-outline', iconActive: 'people' },
        {
          name: 'alerts',
          title: 'Alerts',
          icon: 'notifications-outline',
          iconActive: 'notifications',
        },
        { name: 'more', title: 'More', icon: 'grid-outline', iconActive: 'grid' },
      ]}
    />
  );
}
