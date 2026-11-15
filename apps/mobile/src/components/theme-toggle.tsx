import { View } from 'react-native';
import { Chips } from '@/components/controls';
import { AppText } from '@/components/primitives';
import { useTheme, type ThemePreference } from '@/theme/theme';

const LABELS: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const BY_LABEL: Record<string, ThemePreference> = {
  Light: 'light',
  Dark: 'dark',
  System: 'system',
};

/** Appearance picker: light, dark or follow the phone. Saved on this device. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Chips
        label="Appearance"
        options={['Light', 'Dark', 'System']}
        value={LABELS[preference]}
        onChange={(l) => {
          const next = BY_LABEL[l];
          if (next) setPreference(next);
        }}
      />
      <AppText variant="caption">System follows your phone setting.</AppText>
    </View>
  );
}
