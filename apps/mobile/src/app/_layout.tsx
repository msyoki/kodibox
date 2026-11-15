import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ToastProvider } from '@/components/overlays';
import { useStackOptions } from '@/components/role-layout';
import { SessionProvider } from '@/lib/session';
import { DemoStateProvider } from '@/state/demo-state';
import { FONT_ASSETS } from '@/theme/fonts';
import { ThemeProvider } from '@/theme/theme';

// Keep the splash up until the fonts are ready, so text never flashes in the system font.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  return <Stack screenOptions={useStackOptions()} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const ready = fontsLoaded || fontError !== null;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  if (!ready) return null;
  return (
    <ThemeProvider>
      <SessionProvider>
        <DemoStateProvider>
          <ToastProvider>
            <RootStack />
          </ToastProvider>
        </DemoStateProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
