import { CaretakerReadings } from '@/features/mobile-caretaker/readings';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Readings | Kodibox' };

export default async function Page() {
  await requireSession();
  return <CaretakerReadings />;
}
