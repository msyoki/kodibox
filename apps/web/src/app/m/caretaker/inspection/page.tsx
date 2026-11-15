import { CaretakerInspection } from '@/features/mobile-caretaker/inspection';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Inspection | Kodibox' };

export default async function Page() {
  await requireSession();
  return <CaretakerInspection />;
}
