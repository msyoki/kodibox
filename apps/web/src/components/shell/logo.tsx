/**
 * Kodibox mark. `light` is for brand-coloured panels (amber outline); `dark` is for
 * page surfaces and uses the `link` token, so it stays visible in light and dark themes.
 * The door is always amber.
 */
export function Logo({ size = 28, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const stroke = tone === 'light' ? 'var(--color-amber)' : 'var(--color-link)';
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="9" width="22" height="16" rx="3" stroke={stroke} strokeWidth="2.2" />
      <path d="M3 12L14 4l11 8" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="11" y="16" width="6" height="9" rx="1" fill="var(--color-amber)" />
    </svg>
  );
}
