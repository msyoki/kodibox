import type { ReactNode } from 'react';
import { ManagerTabs } from '@/components/mobile-ui/persona-tabs';
import { requireSession } from '@/server/session';

export default async function ManagerLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <>
      <main className="flex-1 pb-6">{children}</main>
      <ManagerTabs />
    </>
  );
}
