import { redirect } from 'next/navigation';
import { TwoFactorSetup } from '@/features/auth/components/two-factor-setup';
import { serverEnv } from '@kodibox/config';
import { safeNext } from '@/lib/app-paths';
import { getSession } from '@/server/session';

export const metadata = { title: 'Set up two-factor | Kodibox' };

export default async function TwoFactorSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const r = await getSession();
  if (r.status === 'unauthenticated') redirect('/login');
  if (r.status === 'no_membership') redirect('/onboarding');
  const safe = safeNext(next, serverEnv.APP_URL);
  // Already compliant: nothing to enrol.
  if (r.status === 'ok' && r.session.twoFactorEnabled) redirect(safe ?? '/login/continue');
  return <TwoFactorSetup next={safe} />;
}
