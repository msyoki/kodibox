import { SecurityView } from '@/features/settings/components/security-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Security | Kodibox' };

export default async function SecurityPage() {
  await requireSession();
  return <SecurityView />;
}
