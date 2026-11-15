import { PrivacyView } from '@/features/settings/components/privacy-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Privacy | Kodibox' };

export default async function PrivacyPage() {
  await requireSession();
  return <PrivacyView />;
}
