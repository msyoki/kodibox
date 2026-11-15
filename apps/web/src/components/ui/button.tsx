import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-control font-bold whitespace-nowrap no-underline transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-not-allowed disabled:opacity-50',
    // every size keeps a >=44px touch target
    size === 'sm' && 'min-h-11 px-3 text-sm',
    size === 'md' && 'min-h-11 px-4 text-sm',
    size === 'lg' && 'min-h-12 px-5 text-[15px]',
    variant === 'primary' && 'bg-brand text-white hover:bg-brand-dark',
    variant === 'secondary' && 'border border-brand bg-surface text-link hover:bg-brand-tint',
    variant === 'ghost' && 'border border-transparent bg-transparent text-text hover:bg-divider',
    variant === 'danger' && 'bg-danger text-on-fill hover:brightness-90',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/** A Next link styled as a button (no asChild pattern). */
export function LinkButton({ href, variant, size, className, children }: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
