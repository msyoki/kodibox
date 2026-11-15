import { CARETAKER_INITIALS, CARETAKER_TASKS } from '@kodibox/demo';
import { View } from 'react-native';
import { Button, IconButton } from '@/components/controls';
import { iconForMark } from '@/components/icon';
import { ListRow } from '@/components/list-row';
import { useToast } from '@/components/overlays';
import { AppText, Badge, Card, Divider, Section } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { formatNairobiWeekday, nowIso, plural } from '@/lib/format';
import { useDemo } from '@/state/demo-state';

const ROUTE = {
  readings: '/readings',
  inspection: '/inspection',
  jobs: '/jobs',
  cash: '/cash',
} as const;

export default function CaretakerTasks() {
  const go = useGo();
  const toast = useToast();
  const { outbox, syncedAt, syncNow } = useDemo();

  return (
    <Screen
      tabs
      title={`Today, ${formatNairobiWeekday(nowIso())}`}
      eyebrow="Baraka Flats · Mvule Apartments"
      right={
        <IconButton
          icon="settings-outline"
          accessibilityLabel="Account"
          onPress={() => go.push('/account')}
        />
      }
    >
      <Card
        tone={outbox.length > 0 ? 'warn' : 'ok'}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <View accessibilityLiveRegion="polite" style={{ flex: 1 }}>
          <AppText variant="strong">
            {outbox.length > 0
              ? `Offline · ${plural(outbox.length, 'item')} waiting to sync`
              : 'All synced'}
          </AppText>
        </View>
        {outbox.length > 0 ? (
          <Button
            label="Sync now"
            size="sm"
            variant="secondary"
            onPress={() => {
              syncNow();
              toast('Everything synced', 'ok');
            }}
          />
        ) : null}
      </Card>
      <AppText>
        <AppText variant="strong">1 of 4 tasks done</AppText>
        <AppText variant="small"> · Last synced {syncedAt}</AppText>
      </AppText>

      <Section title="Today's tasks">
        <View style={{ gap: 8 }}>
          {CARETAKER_TASKS.map((t) => (
            <ListRow
              key={t.id}
              icon={iconForMark(t.mark)}
              title={t.title}
              subtitle={t.sub}
              right={<Badge tone={t.tone}>{t.badge}</Badge>}
              onPress={() => go.push(ROUTE[t.id])}
            />
          ))}
        </View>
      </Section>

      <Section title="Waiting to sync">
        {outbox.length === 0 ? (
          <AppText variant="small">
            Nothing waiting. Entries sync automatically when you are online.
          </AppText>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {outbox.map((q, i) => (
              <View key={q.id}>
                {i > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 12,
                    paddingVertical: 12,
                  }}
                >
                  <AppText style={{ flex: 1 }}>{q.label}</AppText>
                  <AppText variant="small">{q.when}</AppText>
                </View>
              </View>
            ))}
          </Card>
        )}
      </Section>
      <AppText variant="caption">
        Signed in as {CARETAKER_INITIALS}. Tenant details stay masked.
      </AppText>
    </Screen>
  );
}
