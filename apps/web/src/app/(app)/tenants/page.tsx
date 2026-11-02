import { listProperties, listTenants } from '@/demo';
import { TenantsList } from '@/features/tenants/components/tenants-list';

export const metadata = { title: 'Tenants | Kodibox' };

export default function Page() {
  const properties = listProperties().map((p) => ({ id: p.id, name: p.name }));
  return <TenantsList tenants={listTenants()} properties={properties} />;
}
