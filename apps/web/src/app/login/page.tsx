import { serverEnv } from '@kodibox/config';
import { safeNext } from '@/lib/app-paths';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = { title: 'Sign in | Kodibox' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safe = safeNext(next, serverEnv.APP_URL);
  return <LoginForm next={safe} />;
}
