import { ManagerAlerts } from '@/features/mobile-manager/alerts';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Alerts | Kodibox' };

export default async function Page() {
  await requireSession();
  return <ManagerAlerts />;
}
