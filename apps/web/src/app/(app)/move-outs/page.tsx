import { MoveOutsView } from '@/features/move-outs/components/move-outs-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Notices & move-outs | Kodibox' };

export default async function MoveOutsPage() {
  await requireSession();
  return <MoveOutsView />;
}
