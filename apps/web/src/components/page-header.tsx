import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}

/** Standard page title row used by every (app) page. */
export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        {eyebrow ? <p className="m-0 text-sm text-muted">{eyebrow}</p> : null}
        <h1 className="m-0 mt-1 text-[28px] font-extrabold tracking-tight">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </header>
  );
}
