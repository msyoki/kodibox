import { Redirect, Stack, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icon';
import { ROLE_HOME, useSession, type Role } from '@/lib/session';
import { manrope } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export function useStackOptions() {
  const { colors } = useTheme();
  return { headerShown: false, contentStyle: { backgroundColor: colors.bg } } as const;
}

/** Stack for a role group, guarded by the in-memory demo role. Real enforcement is server-side (`can()`). */
export function RoleStack({ role }: { role: Role }) {
  const { role: current } = useSession();
  const options = useStackOptions();
  if (current !== role) return <Redirect href={current ? ROLE_HOME[current] : '/'} />;
  return <Stack screenOptions={options} />;
}

export interface TabDef {
  name: string;
  title: string;
  /** Outline icon when inactive, filled icon when active. */
  icon: IconName;
  iconActive: IconName;
  badge?: number;
}

/** Bottom tabs coloured from the active palette. */
export function RoleTabs({ tabs }: { tabs: TabDef[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.link,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // Content height plus a single bottom inset (the bar is not padded again elsewhere).
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 12, fontFamily: manrope('700') },
        // Mockup: the active tab is a soft-green pill (radius 10) on the white bar.
        tabBarActiveBackgroundColor: colors.brandSoft,
        tabBarItemStyle: { minHeight: 48, borderRadius: 10, marginHorizontal: 4 },
        tabBarBadgeStyle: { backgroundColor: colors.danger },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: `${t.title} tab`,
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? t.iconActive : t.icon} color={String(color)} size={24} />
            ),
            ...(t.badge ? { tabBarBadge: t.badge } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}
