import { CaretakerHome } from '@/features/mobile-caretaker/home';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Caretaker | Kodibox' };

export default async function Page() {
  await requireSession();
  return <CaretakerHome />;
}
