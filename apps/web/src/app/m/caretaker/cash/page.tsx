import { CaretakerCash } from '@/features/mobile-caretaker/cash';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Cash | Kodibox' };

export default async function Page() {
  await requireSession();
  return <CaretakerCash />;
}
