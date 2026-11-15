import { useFocusEffect, useRouter, type Href } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useCallback, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/components/controls';
import { AppText } from '@/components/primitives';
import { useTheme } from '@/theme/theme';

/** Navigate by path string. Routes are checked by expo-router at runtime. */
export function useGo() {
  const router = useRouter();
  return {
    push: (path: string) => router.push(path as Href),
    replace: (path: string) => router.replace(path as Href),
    back: (fallback: string) =>
      router.canGoBack() ? router.back() : router.replace(fallback as Href),
  };
}

/**
 * Page frame: themed background, safe-area padding, optional header (eyebrow, title, back button,
 * right slot) and a scrolling body. Set `tabs` on tab screens so no extra bottom padding is added.
 */
export function Screen({
  title,
  eyebrow,
  back,
  right,
  children,
  footer,
  tabs,
  scroll = true,
  hero,
}: {
  title?: string;
  eyebrow?: string;
  /** Fallback route for the back button. Omit for no back button. */
  back?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tabs?: boolean;
  scroll?: boolean;
  /** Fill the whole screen with the brandDark hero panel (Welcome). */
  hero?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const go = useGo();
  // Android 3-button/gesture bar sits over the app (edge-to-edge): paint the strip under it with
  // the hero or surface colour and pick button colours that contrast with it.
  const navBg = hero ? colors.brandDark : colors.bg;
  const navDarkBg = hero || isDark;
  useFocusEffect(
    useCallback(() => {
      NavigationBar.setStyle(navDarkBg ? 'light' : 'dark');
    }, [navDarkBg]),
  );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: hero ? colors.brandDark : colors.bg,
        paddingTop: insets.top,
      }}
    >
      <StatusBar style={hero || isDark ? 'light' : 'dark'} />
      {title || back ? (
        // Mockup header: sits on the page background, small muted eyebrow above a bold title,
        // 44 px bordered white icon buttons.
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 20,
            backgroundColor: colors.bg,
          }}
        >
          {back ? (
            <IconButton
              icon="chevron-back"
              accessibilityLabel="Back"
              onPress={() => go.back(back)}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            {eyebrow ? <AppText variant="small">{eyebrow}</AppText> : null}
            {title ? (
              <AppText
                variant="h1"
                numberOfLines={1}
                accessibilityRole="header"
                style={{ fontSize: back ? 20 : 22, marginTop: eyebrow ? 2 : 0 }}
              >
                {title}
              </AppText>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: hero ? colors.brandDark : colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: 16, gap: 16 }}>{children}</View>
        )}
        {footer ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 10,
              // Mockups keep the action on the page background; the hero (Welcome) blends into the brand panel.
              backgroundColor: hero ? colors.brandDark : colors.bg,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
      {tabs ? null : <View style={{ height: insets.bottom, backgroundColor: navBg }} />}
    </View>
  );
}
