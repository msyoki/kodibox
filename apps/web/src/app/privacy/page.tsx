import Link from 'next/link';
import {
  CONTACT_EMAIL,
  CONTROLLER_ADDRESS,
  CONTROLLER_NAME,
  ODPC_REG_NO,
  PRIVACY_NOTICE_VERSION,
  assertControllerIdentityConfigured,
} from '@kodibox/core';

export const metadata = { title: 'Privacy notice | Kodibox' };
// Rendered per request so the production identity guard runs at runtime, not at build.
export const dynamic = 'force-dynamic';

const h2 = 'm-0 mt-2 text-xl font-bold';

/**
 * Public privacy notice for sign-in and account-security data (Kenya Data Protection Act, 2019).
 * Controller identity comes from @kodibox/core constants; in production the page refuses to render
 * while any of them is still a placeholder. Internal legal questions live in
 * docs/PRIVACY_BY_DESIGN.md section 11, not here. Bump PRIVACY_NOTICE_VERSION on any change.
 */
export default function PrivacyPage() {
  assertControllerIdentityConfigured();
  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-5 py-10 text-[15px] leading-relaxed text-text">
      <header>
        <Link href="/login" className="text-sm font-semibold">
          Back to sign in
        </Link>
        <h1 className="m-0 mt-3 text-3xl font-extrabold tracking-tight">Privacy notice</h1>
        <p className="m-0 mt-1 text-sm text-muted">Version {PRIVACY_NOTICE_VERSION}</p>
      </header>

      <section>
        <h2 className={h2}>Who is responsible for your data</h2>
        <p>
          For the account and sign-in data described here, the data controller is {CONTROLLER_NAME},{' '}
          {CONTROLLER_ADDRESS} (ODPC registration {ODPC_REG_NO}). If you are a tenant, caretaker or
          other member of a landlord&apos;s or property manager&apos;s organization, the records
          that organization keeps about you (leases, payments, requests) are covered by that
          organization&apos;s own privacy notice; Kodibox processes them on its behalf.
        </p>
      </section>

      <section>
        <h2 className={h2}>What we collect, why, and on what basis</h2>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          <li>
            <strong>Email address or phone number, name and password.</strong> To create your
            account, recognise you and keep it secure. Your password is stored only as a salted
            hash. Basis: performing our contract with you. Required: you cannot have an account
            without at least a phone number or an email address and a way to sign in.
          </li>
          <li>
            <strong>One-time codes by SMS.</strong> If you sign in with your phone number we send
            one text, exactly: &ldquo;Kodibox code 123456. Valid 5 min. Do not share.&rdquo; (with
            your code in place of 123456). We never use it for marketing. Basis: performing our
            contract and keeping accounts secure. Required only if you choose phone sign-in;
            otherwise use a password. Delivery is by a messaging provider acting on our
            instructions.
          </li>
          <li>
            <strong>Authenticator-app secret and recovery codes.</strong> A second sign-in step.
            Basis: our legitimate interest in account security, and our contract with you. Required
            for owners, managers and accountants: without it those roles cannot use Kodibox.
            Optional for other roles.
          </li>
          <li>
            <strong>Device and network details (IP address, browser, sign-in times).</strong> Shown
            in your list of signed-in devices and kept in a security log to detect and investigate
            account takeover. Basis: our legitimate interest in security. Collected automatically;
            we cannot sign you in without it.
          </li>
          <li>
            <strong>Breached-password check.</strong> When you set a password we check it against a
            public list of leaked passwords using only a short partial hash, so the password is
            never sent. Basis: our legitimate interest in security. Part of setting a password.
          </li>
        </ul>
        <p>
          We do not sell this data, use it for advertising, or make decisions about you by automated
          means or profiling.
        </p>
      </section>

      <section>
        <h2 className={h2}>How long we keep it</h2>
        <ul>
          <li>
            Sessions: until they expire (up to 30 days; 12 hours for owners, managers and
            accountants), then deleted.
          </li>
          <li>One-time codes and email links: deleted when used or expired.</li>
          <li>
            Account data: while your account is active, then removed or anonymised as the law
            allows.
          </li>
          <li>
            Security log: kept for a limited period needed for security and legal obligations.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={h2}>Your rights and how to use them</h2>
        <p>
          You can ask to see, correct, delete or receive a copy of your personal data, object to or
          restrict how we use it, and withdraw any consent you gave (withdrawing does not affect
          what happened before). Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from
          the address or phone number on your account, say what you want, and we will confirm your
          identity and reply within the period the Data Protection Act sets. If you are not
          satisfied, you may complain to the Office of the Data Protection Commissioner (ODPC) of
          Kenya.
        </p>
      </section>

      <section>
        <h2 className={h2}>Sharing and transfers</h2>
        <p>
          We share data only with service providers that help us run sign-in (hosting, SMS and email
          delivery, the breached-password check). Some may process data outside Kenya; where they
          do, we put in place the safeguards the Act requires.
        </p>
      </section>
    </main>
  );
}
