import { View } from 'react-native';
import { AppText, toneColors } from '@/components/primitives';
import { useTheme } from '@/theme/theme';

/** Emergency guidance shown above ticket forms and lists. */
export function EmergencyBanner({ text }: { text: string }) {
  const { colors } = useTheme();
  const t = toneColors(colors, 'danger');
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.fg,
        backgroundColor: t.bg,
      }}
    >
      <AppText color={t.fg} style={{ fontSize: 18, fontWeight: '800' }}>
        !
      </AppText>
      <AppText color={t.fg} style={{ flex: 1, fontWeight: '700', fontSize: 14 }}>
        {text}
      </AppText>
    </View>
  );
}
