import { MaintenanceView } from '@/features/maintenance/components/maintenance-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Expenses & repairs | Kodibox' };

export default async function MaintenancePage() {
  await requireSession();
  return <MaintenanceView />;
}
