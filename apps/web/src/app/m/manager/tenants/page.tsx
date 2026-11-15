import { ManagerTenants } from '@/features/mobile-manager/tenants';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Tenants | Kodibox' };

export default async function Page() {
  await requireSession();
  return <ManagerTenants />;
}
