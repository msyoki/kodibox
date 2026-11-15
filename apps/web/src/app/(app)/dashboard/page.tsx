import { DashboardView } from '@/features/dashboard/components/dashboard-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Dashboard | Kodibox' };

export default async function DashboardPage() {
  await requireSession();
  return <DashboardView />;
}
