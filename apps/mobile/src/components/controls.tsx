import type { ReactNode } from 'react';
import {
  Pressable,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Icon, type IconName } from '@/components/icon';
import { AppText, toneColors } from '@/components/primitives';
import { lightColors } from '@kodibox/ui';
import { manrope } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

const MIN_TOUCH = 44;

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'header' | 'accent';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors, onBrandStrong } = useTheme();
  const palette = {
    primary: { bg: colors.brand, fg: onBrandStrong, border: colors.brand },
    // Outlined brand button, as the mockups' "Share" / "Download PDF".
    secondary: { bg: colors.surface, fg: colors.link, border: colors.brand },
    ghost: { bg: 'transparent', fg: colors.link, border: 'transparent' },
    danger: { bg: colors.danger, fg: colors.onFill, border: colors.danger },
    /** Header call-to-action (mockup "New ticket"): solid brand, white text. */
    header: { bg: colors.brand, fg: onBrandStrong, border: colors.brand },
    /** Amber call-to-action for brandDark hero panels (Welcome); matches the amber logo. */
    accent: { bg: colors.amber, fg: lightColors.text, border: colors.amber },
  }[variant];
  const height = size === 'lg' ? 54 : size === 'sm' ? MIN_TOUCH : 48;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: height,
          minWidth: MIN_TOUCH,
          borderRadius: size === 'lg' ? 14 : 12,
          paddingHorizontal: size === 'sm' ? 14 : 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <AppText
        color={palette.fg}
        style={{
          fontSize: size === 'sm' ? 14 : size === 'lg' ? 16 : 15,
          fontWeight: variant === 'ghost' || variant === 'secondary' ? '700' : '800',
          textAlign: 'center',
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/** Icon-only button: always give it an accessibilityLabel. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  onDark,
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  /** Draw on a brandDark hero panel (Welcome) instead of the page background. */
  onDark?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: MIN_TOUCH,
        height: MIN_TOUCH,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        // Mockup: white (surface) square with a 1px border and a dark icon.
        borderColor: onDark ? colors.brandLine : colors.border,
        backgroundColor: onDark
          ? pressed
            ? colors.brandLine
            : 'transparent'
          : pressed
            ? colors.divider
            : colors.surface,
      })}
    >
      <Icon name={icon} size={22} color={onDark ? colors.onBrand : colors.text} />
    </Pressable>
  );
}

export function Field({
  label,
  error,
  help,
  optional,
  multiline,
  ...input
}: TextInputProps & {
  label: string;
  error?: string | undefined;
  help?: string;
  optional?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="strong" style={{ fontSize: 14 }}>
        {label}
        {optional ? <AppText variant="small"> (optional)</AppText> : null}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        {...input}
        style={[
          {
            minHeight: multiline ? 88 : 52,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.borderStrong,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: multiline ? 10 : 0,
            fontSize: 16,
            fontFamily: manrope('500'),
            color: colors.text,
            backgroundColor: colors.surface,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          input.style,
        ]}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
          {error}
        </AppText>
      ) : help ? (
        <AppText variant="caption">{help}</AppText>
      ) : null}
    </View>
  );
}

/** Single-choice chips (segmented control). */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: readonly T[];
  /** null = nothing chosen yet (forces an explicit choice). */
  value: T | null;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? (
        <AppText variant="strong" style={{ fontSize: 14 }}>
          {label}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = o === value;
          return (
            <Pressable
              key={o}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o)}
              style={{
                minHeight: MIN_TOUCH,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: on ? colors.brand : colors.borderStrong,
                backgroundColor: on ? colors.brandSoft : colors.surface,
              }}
            >
              <AppText
                color={on ? colors.link : colors.text}
                style={{ fontSize: 13, fontWeight: on ? '700' : '600' }}
              >
                {o}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 6,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="strong">{label}</AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.barTrack, true: colors.brand }}
        thumbColor={colors.onFill}
      />
    </View>
  );
}

/** Stand-in for a camera capture: toggles "photo added". No image is read or uploaded. */
export function PhotoButton({
  added,
  onToggle,
  label,
}: {
  added: boolean;
  onToggle: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  const t = added ? toneColors(colors, 'ok') : { bg: colors.surface, fg: colors.link };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: added }}
      onPress={onToggle}
      style={{
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: added ? colors.ok : colors.brand,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
      }}
    >
      <AppText color={t.fg} style={{ fontWeight: '700', fontSize: 14 }}>
        {added ? 'Photo added (tap to remove)' : label}
      </AppText>
    </Pressable>
  );
}

export function Row({ children, gap = 8 }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', gap }}>{children}</View>;
}
