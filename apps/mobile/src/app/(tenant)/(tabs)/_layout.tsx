import { RoleTabs } from '@/components/role-layout';

export default function TenantTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'home', title: 'Home', icon: 'home-outline', iconActive: 'home' },
        { name: 'payments', title: 'Payments', icon: 'card-outline', iconActive: 'card' },
        { name: 'requests', title: 'Requests', icon: 'construct-outline', iconActive: 'construct' },
        { name: 'profile', title: 'Profile', icon: 'person-outline', iconActive: 'person' },
      ]}
    />
  );
}
