import { Card, CardHeader } from '@/components/ui';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export const metadata = { title: 'Appearance | Kodibox' };

export default function AppearancePage() {
  return (
    <Card aria-labelledby="ap" className="flex max-w-xl flex-col gap-3">
      <CardHeader id="ap" title="Appearance" />
      <p className="m-0 text-sm text-muted">
        Choose a light or dark theme, or follow your device setting. This choice is saved on this
        browser only.
      </p>
      <ThemeToggle variant="segmented" />
    </Card>
  );
}
