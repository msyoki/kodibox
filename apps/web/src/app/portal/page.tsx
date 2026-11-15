import { PortalView } from '@/features/portal/components/portal-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Landlord portal | Kodibox' };

export default async function PortalPage() {
  await requireSession();
  return <PortalView />;
}
