import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Single icon family (Ionicons) so every screen looks consistent. Pass a token colour from the theme. */
export function Icon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} accessible={false} />;
}

/** Icons for the short feature codes used by the demo data (tasks, alerts). Falls back to a dot. */
const MARK_ICONS: Record<string, IconName> = {
  Rd: 'speedometer-outline',
  Mo: 'exit-outline',
  Jb: 'construct-outline',
  Ca: 'cash-outline',
  Pay: 'card-outline',
  Tkt: 'chatbubble-ellipses-outline',
  Sms: 'mail-unread-outline',
};

export function iconForMark(mark: string): IconName {
  return MARK_ICONS[mark] ?? 'ellipse-outline';
}
