import { TeamView } from '@/features/settings/components/team-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Settings | Kodibox' };

export default async function SettingsPage() {
  await requireSession();
  return <TeamView />;
}
