import { cn } from '@/lib/cn';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-full bg-brand-soft font-extrabold text-link',
        size === 'sm' && 'size-7 text-[11px]',
        size === 'md' && 'size-9 text-[13px]',
        size === 'lg' && 'size-12 text-base',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
