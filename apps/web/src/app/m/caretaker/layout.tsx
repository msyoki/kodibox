import type { ReactNode } from 'react';
import { CaretakerTabs } from '@/components/mobile-ui/persona-tabs';

export default function CaretakerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex-1 pb-6">{children}</main>
      <CaretakerTabs />
    </>
  );
}
