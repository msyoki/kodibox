import { PaymentInstructionsView } from '@/features/settings/components/payment-instructions-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Payment instructions | Kodibox' };

export default async function PaymentInstructionsPage() {
  await requireSession();
  return <PaymentInstructionsView />;
}
