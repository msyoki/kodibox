import { View } from 'react-native';
import { IconButton, Button } from '@/components/controls';
import { Logo } from '@/components/logo';
import { AppText } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { useSession } from '@/lib/session';
import { useTheme, type ThemePreference } from '@/theme/theme';

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export default function Welcome() {
  const go = useGo();
  const { welcome } = useSession();
  const { preference, setPreference, colors, onBrandStrong } = useTheme();
  return (
    <Screen
      scroll={false}
      hero
      footer={
        <Button
          label="Get started"
          size="lg"
          variant="accent"
          onPress={() => {
            welcome();
            go.replace('/login');
          }}
        />
      }
    >
      <View style={{ alignItems: 'flex-end' }}>
        <IconButton
          onDark
          icon="contrast-outline"
          accessibilityLabel={`Appearance: ${preference}. Tap to change.`}
          onPress={() => setPreference(NEXT[preference])}
        />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <Logo size={64} />
        <AppText variant="title" color={onBrandStrong}>
          Kodibox
        </AppText>
        <AppText style={{ fontSize: 18 }} color={onBrandStrong}>
          Pay rent, track your property and sort repairs, all from your phone.
        </AppText>
        <AppText variant="caption" color={colors.onBrand}>
          Demo mode. Sample data only, and your money always goes straight to the landlord.
        </AppText>
      </View>
    </Screen>
  );
}
