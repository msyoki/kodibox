import type { ReactNode } from 'react';
import {
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { StyleSheet } from 'react-native';
import { formatMinor, formatMinorPlain } from '@/lib/format';
import { Icon, type IconName } from '@/components/icon';
import { manrope, plexMono } from '@/theme/fonts';
import { useTheme, useThemedStyles, type Palette } from '@/theme/theme';

export type Tone = 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

/** Soft background and foreground colours for a tone, from the active palette. */
export function toneColors(c: Palette, tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'ok':
      return { bg: c.okSoft, fg: c.ok };
    case 'warn':
      return { bg: c.warnSoft, fg: c.warn };
    case 'danger':
      return { bg: c.dangerSoft, fg: c.danger };
    case 'info':
      return { bg: c.infoSoft, fg: c.info };
    case 'neutral':
      return { bg: c.divider, fg: c.muted };
    default:
      return { bg: c.brandSoft, fg: c.link };
  }
}

type Variant = 'title' | 'h1' | 'h2' | 'body' | 'strong' | 'small' | 'caption' | 'mono';

const makeTextStyles = (c: Palette) =>
  StyleSheet.create({
    title: { color: c.text, fontSize: 28, fontWeight: '800' },
    h1: { color: c.text, fontSize: 22, fontWeight: '800' },
    h2: { color: c.text, fontSize: 16, fontWeight: '800' },
    body: { color: c.body, fontSize: 15 },
    strong: { color: c.text, fontSize: 15, fontWeight: '700' },
    small: { color: c.muted, fontSize: 13 },
    caption: { color: c.muted, fontSize: 12 },
    mono: { color: c.text, fontSize: 13, fontWeight: '400', fontFamily: 'IBMPlexMono_400Regular' },
  });

/** Themed text. `muted` swaps to the secondary colour; `color` overrides with a palette token value. */
export function AppText({
  variant = 'body',
  muted,
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const s = useThemedStyles(makeTextStyles);
  const { colors } = useTheme();
  const merged = StyleSheet.flatten([
    s[variant],
    muted ? { color: colors.muted } : null,
    color ? { color } : null,
    style,
  ]) as TextStyle;
  // Custom fonts need a weight-specific family on Android; mono text keeps Plex Mono.
  const family =
    typeof merged.fontFamily === 'string' && merged.fontFamily.startsWith('IBMPlexMono')
      ? plexMono(merged.fontWeight)
      : manrope(merged.fontWeight);
  return <Text {...rest} style={[merged, { fontFamily: family, fontWeight: undefined }]} />;
}

const makeCardStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
    },
  });

export function Card({
  children,
  style,
  tone,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: Tone;
}) {
  const s = useThemedStyles(makeCardStyles);
  const { colors } = useTheme();
  const t = tone ? toneColors(colors, tone) : null;
  return (
    <View
      style={[
        s.card,
        // Mockup banners: soft tone fill, no visible outline, radius 12.
        t ? { backgroundColor: t.bg, borderColor: t.bg, borderRadius: 12 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="h2" accessibilityRole="header">
          {title}
        </AppText>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Soft tile used on list rows: an icon (features, actions) or short text such as initials (people). */
export function Mark({
  children,
  icon,
  tone = 'brand',
  size = 'md',
}: {
  children?: string;
  icon?: IconName;
  tone?: Tone;
  /** `sm` is the 32 px quick-action tile mark; `md` is the 40 px row mark. */
  size?: 'sm' | 'md';
}) {
  const { colors } = useTheme();
  const t = toneColors(colors, tone);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size === 'sm' ? 32 : 40,
        height: size === 'sm' ? 32 : 40,
        borderRadius: size === 'sm' ? 10 : 12,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ? (
        <Icon name={icon} color={t.fg} size={size === 'sm' ? 18 : 22} />
      ) : (
        <Text style={{ color: t.fg, fontFamily: manrope('800'), fontSize: 13 }}>{children}</Text>
      )}
    </View>
  );
}

/** Small status pill. */
export function Badge({ children, tone = 'neutral' }: { children: string; tone?: Tone }) {
  const { colors } = useTheme();
  const t = toneColors(colors, tone);
  return (
    <View
      style={{
        backgroundColor: t.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: t.fg, fontSize: 12, fontFamily: manrope('700') }}>{children}</Text>
    </View>
  );
}
export const Pill = Badge;

const SIZES = { md: 14, lg: 24, xl: 34 } as const;

/** Money display. Only ever takes bigint minor units and formats through @kodibox/core. */
export function Amount({
  minor,
  size = 'md',
  prefix = true,
  tone,
  strong,
  style,
}: {
  minor: bigint;
  size?: keyof typeof SIZES;
  prefix?: boolean;
  tone?: Tone;
  strong?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const color = tone ? toneColors(colors, tone).fg : colors.text;
  return (
    <Text
      style={[
        {
          color,
          fontSize: SIZES[size],
          // IBM Plex Mono as in the mockups: medium for headline amounts, regular for line items.
          fontFamily: plexMono(strong || size !== 'md' ? '500' : '400'),
        },
        style,
      ]}
    >
      {prefix ? formatMinor(minor) : formatMinorPlain(minor)}
    </Text>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 8, padding: 24 }}>
      <AppText variant="h2" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="small" style={{ textAlign: 'center' }}>
          {description}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

export function ProgressBar({
  value,
  label,
  tone = 'brand',
}: {
  /** 0 to 100. */
  value: number;
  label: string;
  tone?: 'brand' | 'warning';
}) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height: 8, borderRadius: 999, backgroundColor: colors.barTrack, overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 999,
          backgroundColor: tone === 'warning' ? colors.warning : colors.brand,
        }}
      />
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.divider }} />;
}
