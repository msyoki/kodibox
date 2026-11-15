import { ManagerHome } from '@/features/mobile-manager/home';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Manager | Kodibox' };

export default async function Page() {
  await requireSession();
  return <ManagerHome />;
}
