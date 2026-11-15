import { RoleTabs } from '@/components/role-layout';

export default function CaretakerTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'tasks', title: 'Tasks', icon: 'checkbox-outline', iconActive: 'checkbox' },
        {
          name: 'readings',
          title: 'Readings',
          icon: 'speedometer-outline',
          iconActive: 'speedometer',
        },
        { name: 'cash', title: 'Cash', icon: 'cash-outline', iconActive: 'cash' },
        { name: 'jobs', title: 'Jobs', icon: 'construct-outline', iconActive: 'construct' },
        { name: 'account', title: 'Account', icon: 'person-outline', iconActive: 'person' },
      ]}
    />
  );
}
