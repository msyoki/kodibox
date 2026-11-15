'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

export const EMPTY_CODE = ['', '', '', '', '', ''];

/** Six single-digit inputs with auto-advance, backspace and paste (same look as the prototype). */
export function CodeBoxes({
  digits,
  onChange,
}: {
  digits: string[];
  onChange: (next: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(i: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1);
    onChange(digits.map((d, idx) => (idx === i ? v : d)));
    if (v && i < 5) refs.current[i + 1]?.focus();
  }
  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }
  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    onChange(Array.from({ length: 6 }, (_, i) => text[i] ?? ''));
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <fieldset className="m-0 flex gap-2 border-0 p-0">
      <legend className="sr-only">6-digit code</legend>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          aria-label={`Digit ${i + 1}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          className="box-border min-h-14 w-full min-w-0 flex-1 rounded-control border border-input-line bg-surface text-center font-mono text-[22px] font-medium focus-visible:outline-2 focus-visible:outline-link"
        />
      ))}
    </fieldset>
  );
}
