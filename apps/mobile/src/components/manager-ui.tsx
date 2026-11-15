import type { Invoice, TicketPriority, UnitStatus } from '@kodibox/demo';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/controls';
import { useToast } from '@/components/overlays';
import { AppText, Card, type Tone } from '@/components/primitives';

export const INVOICE_TONE: Record<Invoice['status'], Tone> = {
  paid: 'ok',
  partial: 'info',
  unpaid: 'neutral',
  overdue: 'danger',
};

export const PRIORITY_TONE: Record<TicketPriority, Tone> = {
  low: 'neutral',
  normal: 'info',
  high: 'warn',
  urgent: 'danger',
};

export const UNIT_TONE: Record<UnitStatus, Tone> = {
  occupied: 'ok',
  vacant: 'neutral',
  notice: 'warn',
};

export const cap = (s: string): string =>
  (s.charAt(0).toUpperCase() + s.slice(1)).replace(/_/g, ' ');

/** Desk-only tasks (lease authoring, bulk runs, exports, imports) are not built as phone flows. */
export function OpenOnWeb({ label = 'Open on web', what }: { label?: string; what: string }) {
  const toast = useToast();
  return (
    <Card tone="info" style={{ gap: 8 }}>
      <AppText variant="small">{what}</AppText>
      <Button
        label={label}
        variant="secondary"
        onPress={() => toast('Opens the Kodibox web app in your browser (demo)', 'info')}
      />
    </Card>
  );
}

/** Small number tile for KPI rows. */
export function Stat({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <Card tone={tone} style={{ flex: 1, minWidth: 140, padding: 12, gap: 2 }}>
      <AppText variant="small">{label}</AppText>
      <AppText variant="h1">{value}</AppText>
    </Card>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}
