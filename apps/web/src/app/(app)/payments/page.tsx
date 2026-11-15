import { PaymentsView } from '@/features/payments/components/payments-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Payments | Kodibox' };

export default async function PaymentsPage() {
  await requireSession();
  return <PaymentsView />;
}
