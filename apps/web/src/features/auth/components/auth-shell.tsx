import { PRIVACY_NOTICE_PATH, PRIVACY_NOTICE_VERSION } from '@kodibox/core';
import type { ReactNode } from 'react';
import { Logo } from '@/components/shell/logo';

const VALUES = [
  {
    title: 'Never holds your money',
    text: 'Rent goes straight to your own M-Pesa paybill or bank account. Kodibox only reconciles the statements you import.',
  },
  {
    title: 'Automatic M-Pesa reconciliation',
    text: 'Every payment is matched to the right unit and invoice, with unmatched ones queued for you.',
  },
  {
    title: 'A tenant app that tenants use',
    text: 'See how to pay, send proof of payment, view statements and request repairs from their phone.',
  },
];

/** Brand panel + centred card shared by sign-in and two-factor enrolment. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-brand text-text">
      <aside className="flex min-w-0 flex-[1_1_380px] flex-col justify-between gap-10 px-[clamp(24px,5vw,72px)] py-12 text-white">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-2xl font-extrabold tracking-tight">Kodibox</span>
        </div>
        <div className="flex max-w-[460px] flex-col gap-7">
          <h1 className="m-0 text-[40px] leading-[1.12] font-extrabold tracking-[-1px]">
            Rent management that never touches your money.
          </h1>
          {VALUES.map((v) => (
            <div key={v.title} className="flex items-start gap-3.5">
              <span className="flex size-10 flex-none items-center justify-center rounded-xl border border-brand-line bg-brand-dark">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F0B54A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              <span className="flex flex-col gap-0.5">
                <strong className="text-[17px] font-bold">{v.title}</strong>
                <span className="text-sm leading-normal text-on-brand">{v.text}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="m-0 text-[13px] text-on-brand">
          Every money change is audited and reversible.
        </p>
      </aside>

      <main className="flex min-w-0 flex-[1.6_1_560px] items-center justify-center px-[clamp(16px,3vw,48px)] py-8">
        <div className="w-full max-w-[460px] rounded-panel bg-surface p-9 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
          {children}
          <p
            className="m-0 mt-6 border-t border-divider pt-4 text-xs leading-normal text-muted"
            data-privacy-notice={PRIVACY_NOTICE_VERSION}
          >
            We use your phone number or email, device details and one-time codes only to sign you in
            and keep your account secure. Read our{' '}
            <a href={PRIVACY_NOTICE_PATH} className="font-semibold">
              privacy notice
            </a>{' '}
            for your rights under the Data Protection Act, 2019.
          </p>
        </div>
      </main>
    </div>
  );
}
