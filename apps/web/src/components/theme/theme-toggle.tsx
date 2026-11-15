'use client';

import type { ThemePreference } from '@kodibox/ui';
import { cn } from '@/lib/cn';
import { useTheme } from './theme-provider';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const NEXT: Record<ThemePreference, ThemePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

function Icon({ pref }: { pref: ThemePreference }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (pref === 'light')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (pref === 'dark')
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

/**
 * `cycle`: one 44px icon button (light, then dark, then system) for tight bars.
 * `segmented`: three labelled radio-style buttons for settings screens.
 */
export function ThemeToggle({
  variant = 'cycle',
  className,
}: {
  variant?: 'cycle' | 'segmented';
  className?: string;
}) {
  const { preference, setPreference } = useTheme();

  if (variant === 'cycle') {
    const current = OPTIONS.find((o) => o.value === preference)?.label ?? 'System';
    return (
      <button
        type="button"
        onClick={() => setPreference(NEXT[preference])}
        aria-label={`Theme: ${current}. Press to change.`}
        title={`Theme: ${current}`}
        className={cn(
          'flex size-11 flex-none items-center justify-center rounded-control text-text hover:bg-divider focus-visible:outline-2 focus-visible:outline-link',
          className,
        )}
      >
        <Icon pref={preference} />
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="Theme" className={cn('grid grid-cols-3 gap-2', className)}>
      {OPTIONS.map((o) => {
        const active = preference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(o.value)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-control border px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link',
              active
                ? 'border-brand bg-brand-soft text-link'
                : 'border-border-strong bg-surface text-muted hover:bg-divider',
            )}
          >
            <Icon pref={o.value} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
