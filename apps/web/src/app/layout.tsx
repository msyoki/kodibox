import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { parseThemePreference, THEME_COOKIE, THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kodibox',
  description: 'Rent and property management for Kenya',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  // `system` is resolved before paint by THEME_INIT_SCRIPT; light/dark render server-side.
  const theme = preference === 'dark' ? 'dark' : 'light';
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${plexMono.variable}`}
      data-theme={theme}
      data-theme-pref={preference}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider initial={preference}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
