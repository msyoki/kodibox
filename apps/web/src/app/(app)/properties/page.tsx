import { PropertiesView } from '@/features/properties/components/properties-view';
import { listPropertyCards } from '@/demo/properties-tenants';

export const metadata = { title: 'Properties | Kodibox' };

export default function Page() {
  return <PropertiesView properties={listPropertyCards()} />;
}
