import type { ReactNode } from 'react';
import { CaretakerTabs } from '@/components/mobile-ui/persona-tabs';
import { requireSession } from '@/server/session';

export default async function CaretakerLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <>
      <main className="flex-1 pb-6">{children}</main>
      <CaretakerTabs />
    </>
  );
}
