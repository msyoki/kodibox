import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import type { TextStyle } from 'react-native';

/** Fonts to load at startup (Manrope for text, IBM Plex Mono for amounts and codes), as in the mockups. */
export const FONT_ASSETS = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
};

type Weight = NonNullable<TextStyle['fontWeight']>;

/** React Native needs a weight-specific family name for custom fonts. */
export function manrope(weight?: Weight): string {
  switch (String(weight ?? '400')) {
    case '500':
      return 'Manrope_500Medium';
    case '600':
      return 'Manrope_600SemiBold';
    case '700':
    case 'bold':
      return 'Manrope_700Bold';
    case '800':
    case '900':
      return 'Manrope_800ExtraBold';
    default:
      return 'Manrope_400Regular';
  }
}

/** Mono has two weights: regular and medium (anything 500 and above). */
export function plexMono(weight?: Weight): string {
  const w = String(weight ?? '400');
  return w === '400' || w === 'normal' || w === '300' || w === '100' || w === '200'
    ? 'IBMPlexMono_400Regular'
    : 'IBMPlexMono_500Medium';
}

export const MONO_FAMILIES = ['IBMPlexMono_400Regular', 'IBMPlexMono_500Medium'];
