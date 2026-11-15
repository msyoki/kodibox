import { TicketsView } from '@/features/tickets/components/tickets-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Tickets | Kodibox' };

export default async function TicketsPage() {
  await requireSession();
  return <TicketsView />;
}
