'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Simple modal on the native <dialog> element: focus trap, Esc to close, backdrop click closes. */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-lg rounded-panel border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/40"
    >
      {open ? (
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 id={titleId} className="m-0 text-xl font-extrabold">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 mb-0 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {children}
          {footer ? (
            <div className="flex flex-wrap justify-end gap-2.5 border-t border-divider pt-4">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
