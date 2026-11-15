import { PropertiesView } from '@/features/properties/components/properties-view';
import { listPropertyCards } from '@/demo/properties-tenants';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Properties | Kodibox' };

export default async function Page() {
  await requireSession();
  return <PropertiesView properties={listPropertyCards()} />;
}
