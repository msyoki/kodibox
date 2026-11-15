import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/theme';

/**
 * Kodibox mark: same geometry as apps/web/src/components/shell/logo.tsx and the
 * web favicon (house outline + amber door). `tile` puts it on a brandDark square
 * like the favicon; `light` is the bare mark for brand-coloured panels, and `dark`
 * is the bare mark for page surfaces (uses the link colour so it shows in both themes).
 */
export function Logo({
  size = 48,
  tone = 'tile',
}: {
  size?: number;
  tone?: 'tile' | 'light' | 'dark';
}) {
  const { colors } = useTheme();
  const stroke = tone === 'dark' ? colors.link : colors.amber;
  const mark = (s: number) => (
    <Svg width={s} height={s} viewBox="0 0 28 28" fill="none">
      <Rect x={3} y={9} width={22} height={16} rx={3} stroke={stroke} strokeWidth={2.2} />
      <Path d="M3 12L14 4l11 8" stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
      <Rect x={11} y={16} width={6} height={9} rx={1} fill={colors.amber} />
    </Svg>
  );

  if (tone !== 'tile') {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {mark(size)}
      </View>
    );
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: colors.brandDark,
        borderWidth: 1,
        borderColor: colors.brandLine,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {mark(size * 0.72)}
    </View>
  );
}
