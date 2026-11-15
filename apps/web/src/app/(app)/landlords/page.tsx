import { LandlordsView } from '@/features/landlords/components/landlords-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Landlords | Kodibox' };

export default async function LandlordsPage() {
  await requireSession();
  return <LandlordsView />;
}
