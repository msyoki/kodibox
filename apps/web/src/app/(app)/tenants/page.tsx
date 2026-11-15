import { listProperties, listTenants } from '@/demo';
import { TenantsList } from '@/features/tenants/components/tenants-list';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Tenants | Kodibox' };

export default async function Page() {
  await requireSession();
  const properties = listProperties().map((p) => ({ id: p.id, name: p.name }));
  return <TenantsList tenants={listTenants()} properties={properties} />;
}
