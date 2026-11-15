import { notFound } from 'next/navigation';
import { getTenant } from '@/demo';
import { buildStatement, revealedContact } from '@/demo/properties-tenants';
import { TenantProfile } from '@/features/tenants/components/tenant-profile';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Tenant | Kodibox' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const detail = getTenant(id);
  if (!detail) notFound();
  return (
    <TenantProfile
      detail={detail}
      ledger={buildStatement(detail)}
      revealed={revealedContact(detail)}
    />
  );
}
