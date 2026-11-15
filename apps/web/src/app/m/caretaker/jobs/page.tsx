import { CaretakerJobs } from '@/features/mobile-caretaker/jobs';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Jobs | Kodibox' };

export default async function Page() {
  await requireSession();
  return <CaretakerJobs />;
}
