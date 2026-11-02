'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const base = useId();
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  function onKeyDown(e: KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const target = tabs[next];
    if (!target) return;
    setActive(target.id);
    document.getElementById(`${base}-tab-${target.id}`)?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t, i) => {
          const selected = t.id === current?.id;
          return (
            <button
              key={t.id}
              id={`${base}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'min-h-11 border-b-2 px-4 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-brand',
                selected
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-text',
              )}
            >
              {t.label}
              {t.badge !== undefined ? (
                <span className="ml-2 rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-text">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {current ? (
        <div
          role="tabpanel"
          id={`${base}-panel-${current.id}`}
          aria-labelledby={`${base}-tab-${current.id}`}
          className="pt-4"
        >
          {current.content}
        </div>
      ) : null}
    </div>
  );
}
