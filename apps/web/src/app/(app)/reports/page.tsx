import { ReportsView } from '@/features/reports/components/reports-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Reports & tax | Kodibox' };

export default async function ReportsPage() {
  await requireSession();
  return <ReportsView />;
}
