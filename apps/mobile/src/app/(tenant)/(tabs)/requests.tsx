import {
  EMERGENCY_GUIDANCE,
  PROPERTY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_TONE,
} from '@kodibox/demo';
import { View } from 'react-native';
import { Button } from '@/components/controls';
import { EmergencyBanner } from '@/components/emergency-banner';
import { ListRow } from '@/components/list-row';
import { Badge, EmptyState } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { formatNairobiDate } from '@/lib/format';
import { useDemo } from '@/state/demo-state';

export default function Requests() {
  const go = useGo();
  const { tickets } = useDemo();
  return (
    <Screen
      tabs
      title="Help and tickets"
      eyebrow={PROPERTY_LABEL}
      right={
        <Button
          label="New ticket"
          variant="header"
          size="sm"
          onPress={() => go.push('/new-request')}
        />
      }
    >
      <EmergencyBanner text={EMERGENCY_GUIDANCE} />
      <View style={{ gap: 8 }} accessibilityLabel="My tickets">
        {tickets.length === 0 ? (
          <EmptyState
            title="No tickets yet"
            description="Tap New ticket to report a repair or complaint."
          />
        ) : null}
        {tickets.map((t) => (
          <ListRow
            key={t.id}
            title={t.title}
            monoSubtitle
            subtitle={`${t.number} · ${t.kindLabel} · opened ${formatNairobiDate(t.createdAt)}`}
            right={<Badge tone={TICKET_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>}
            onPress={() => go.push(`/ticket/${t.id}`)}
          />
        ))}
      </View>
    </Screen>
  );
}
