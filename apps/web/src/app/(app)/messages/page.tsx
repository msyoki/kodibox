import { MessagesView } from '@/features/messages/components/messages-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Messages | Kodibox' };

export default async function MessagesPage() {
  await requireSession();
  return <MessagesView />;
}
