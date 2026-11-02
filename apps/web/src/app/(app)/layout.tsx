import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ToastProvider } from '@/components/ui';
import { DemoStoreProvider } from '@/demo/store';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <DemoStoreProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </DemoStoreProvider>
  );
}
