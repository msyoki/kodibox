import { redirect } from 'next/navigation';
import { serverEnv } from '@kodibox/config';
import { safeNext } from '@/lib/app-paths';
import { getSession } from '@/server/session';

export const metadata = { title: 'Signing in | Kodibox' };

/** Post-sign-in router: enrolment gate first, then the right home for the user's roles. */
export default async function ContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safe = safeNext(next, serverEnv.APP_URL);
  const r = await getSession();
  if (r.status === 'enrol_2fa')
    redirect(`/login/2fa-setup${safe ? `?next=${encodeURIComponent(safe)}` : ''}`);
  if (r.status === 'no_membership') redirect('/onboarding');
  if (r.status !== 'ok') redirect('/login');
  if (safe) redirect(safe);
  const roles = r.session.roles;
  const staff = roles.some((x) => ['owner', 'manager', 'accountant'].includes(x));
  if (!staff && roles.includes('caretaker')) redirect('/m/caretaker');
  if (!staff && roles.includes('tenant')) redirect('/m/tenant');
  redirect('/dashboard');
}
