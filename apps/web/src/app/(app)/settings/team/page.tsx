import { TeamView } from '@/features/settings/components/team-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Team & roles | Kodibox' };

export default async function TeamPage() {
  await requireSession();
  return <TeamView />;
}
