import { BillingView } from '@/features/settings/components/billing-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Billing | Kodibox' };

export default async function BillingPage() {
  await requireSession();
  return <BillingView />;
}
