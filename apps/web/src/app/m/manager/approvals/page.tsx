import { ManagerApprovals } from '@/features/mobile-manager/approvals';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Approvals | Kodibox' };

export default async function Page() {
  await requireSession();
  return <ManagerApprovals />;
}
