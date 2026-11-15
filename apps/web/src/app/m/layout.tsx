import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { DemoStoreProvider } from '@/demo/store';

/**
 * Phone-like shell for the mobile views (P-06). On a desktop browser the app renders in a centred
 * 420px column; on a phone it fills the screen. Persona layouts add <TabBar tabs={...} /> at the end.
 */
export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <DemoStoreProvider>
      <ToastProvider>
        <div className="min-h-screen bg-backdrop">
          <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-bg shadow-xl">
            {children}
          </div>
        </div>
      </ToastProvider>
    </DemoStoreProvider>
  );
}
