import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/components/icon';
import { AppText, Mark, type Tone } from '@/components/primitives';
import { useTheme } from '@/theme/theme';

/** A tappable (or static) row: optional mark, title and subtitle, right-hand slot. At least 56 px tall. */
export function ListRow({
  title,
  subtitle,
  mark,
  icon,
  markTone,
  right,
  onPress,
  selected,
  boxed = true,
  monoSubtitle,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  mark?: string;
  icon?: IconName;
  markTone?: Tone;
  right?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  /** Draw the row as its own bordered card (default). Turn off inside a Card. */
  boxed?: boolean;
  /** Set the subtitle in IBM Plex Mono (references, codes, meter numbers). */
  monoSubtitle?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const body = (
    <>
      {icon || mark ? (
        <Mark tone={markTone ?? 'brand'} icon={icon}>
          {mark}
        </Mark>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="strong" style={{ fontSize: 14 }}>
          {title}
        </AppText>
        {subtitle ? (
          monoSubtitle ? (
            <AppText variant="mono" muted style={{ fontSize: 12 }}>
              {subtitle}
            </AppText>
          ) : (
            <AppText variant="caption">{subtitle}</AppText>
          )
        ) : null}
      </View>
      {right ? <View style={{ alignItems: 'flex-end', gap: 4 }}>{right}</View> : null}
    </>
  );
  const frame = {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: boxed ? 12 : 0,
    paddingVertical: 10,
    ...(boxed
      ? {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: selected ? colors.brand : colors.border,
          backgroundColor: selected ? colors.brandTint : colors.surface,
        }
      : {}),
  };
  if (!onPress) {
    return (
      <View style={frame} accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [frame, pressed ? { opacity: 0.85 } : null]}
    >
      {body}
    </Pressable>
  );
}
