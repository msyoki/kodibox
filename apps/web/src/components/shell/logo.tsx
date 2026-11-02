export function Logo({ size = 28, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const stroke = tone === 'light' ? '#F0B54A' : '#0E4D45';
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="9" width="22" height="16" rx="3" stroke={stroke} strokeWidth="2.2" />
      <path d="M3 12L14 4l11 8" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="11" y="16" width="6" height="9" rx="1" fill="#F0B54A" />
    </svg>
  );
}
