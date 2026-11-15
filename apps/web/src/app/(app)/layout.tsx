import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ToastProvider } from '@/components/ui';
import { DemoStoreProvider } from '@/demo/store';
import { requireSession } from '@/server/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireSession(); // 2FA gate + idle/absolute limits; roles/org come from E-05
  return (
    <DemoStoreProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </DemoStoreProvider>
  );
}
