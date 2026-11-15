import { ImportWizard } from '@/features/properties/components/import-wizard';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Import tenants | Kodibox' };

export default async function Page() {
  await requireSession();
  return <ImportWizard />;
}
