import type { ReactNode } from 'react';
import { ManagerTabs } from '@/components/mobile-ui/persona-tabs';

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex-1 pb-6">{children}</main>
      <ManagerTabs />
    </>
  );
}
