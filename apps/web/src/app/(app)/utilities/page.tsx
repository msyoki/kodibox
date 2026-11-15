import { UtilitiesView } from '@/features/utilities/components/utilities-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Utilities | Kodibox' };

export default async function UtilitiesPage() {
  await requireSession();
  return <UtilitiesView />;
}
