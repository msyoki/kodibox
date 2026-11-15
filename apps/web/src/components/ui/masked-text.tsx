import { cn } from '@/lib/cn';
import { maskId, maskPhone } from '@/lib/mask';

export interface MaskedTextProps {
  kind: 'phone' | 'id';
  value: string;
  className?: string;
}

/** PII is masked everywhere in the UI (DPA 2019). The full value is never rendered. */
export function MaskedText({ kind, value, className }: MaskedTextProps) {
  const masked = kind === 'phone' ? maskPhone(value) : maskId(value);
  return <span className={cn('font-mono text-[0.92em]', className)}>{masked}</span>;
}
