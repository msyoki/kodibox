import { AuditView } from '@/features/settings/components/audit-view';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Audit log | Kodibox' };

export default async function AuditPage() {
  await requireSession();
  return <AuditView />;
}
