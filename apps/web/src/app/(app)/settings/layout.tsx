import type { ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { SettingsNav } from '@/features/settings/components/settings-nav';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" eyebrow="Mwangi Properties" />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
