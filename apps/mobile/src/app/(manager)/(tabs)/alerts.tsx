import { MANAGER_ALERTS } from '@kodibox/demo';
import { View } from 'react-native';
import { Button } from '@/components/controls';
import { iconForMark } from '@/components/icon';
import { useToast } from '@/components/overlays';
import { AppText, Mark } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { useDemo } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';

export default function Alerts() {
  const toast = useToast();
  const { colors } = useTheme();
  const { readAlerts, markAlertRead, markAllAlertsRead } = useDemo();
  const isUnread = (id: string, unread: boolean) => unread && !readAlerts.includes(id);
  const unread = MANAGER_ALERTS.filter((a) => isUnread(a.id, a.unread)).length;

  return (
    <Screen
      tabs
      title="Alerts"
      right={
        <Button
          label="Mark all read"
          size="sm"
          variant="header"
          disabled={unread === 0}
          onPress={() => {
            markAllAlertsRead(MANAGER_ALERTS.map((a) => a.id));
            toast('All alerts marked read', 'ok');
          }}
        />
      }
    >
      <AppText variant="small" accessibilityLiveRegion="polite">
        {unread} unread
      </AppText>
      <View style={{ gap: 8 }}>
        {MANAGER_ALERTS.map((a) => {
          const fresh = isUnread(a.id, a.unread);
          return (
            <View
              key={a.id}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: fresh ? colors.borderStrong : colors.border,
                backgroundColor: fresh ? colors.surface : colors.soft,
              }}
            >
              <Mark tone={a.tone} icon={iconForMark(a.mark)} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="strong" style={{ flexShrink: 1 }}>
                    {a.title}
                  </AppText>
                  {fresh ? (
                    <View
                      accessibilityLabel="Unread"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.amber,
                      }}
                    />
                  ) : null}
                </View>
                <AppText variant="caption">{a.body}</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {a.action ? (
                    <Button
                      label={a.action.label}
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        toast(a.action?.message ?? '', 'ok');
                        markAlertRead(a.id);
                      }}
                    />
                  ) : null}
                  {fresh ? (
                    <Button
                      label="Mark read"
                      size="sm"
                      variant="ghost"
                      accessibilityLabel={`Mark ${a.title} read`}
                      onPress={() => markAlertRead(a.id)}
                    />
                  ) : null}
                </View>
              </View>
              <AppText variant="caption">{a.time}</AppText>
            </View>
          );
        })}
      </View>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        Push notifications never show tenant names or amounts on the lock screen.
      </AppText>
    </Screen>
  );
}
