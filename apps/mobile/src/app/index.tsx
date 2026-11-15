import { Redirect, type Href } from 'expo-router';
import { ROLE_HOME, useSession } from '@/lib/session';

/** Entry gate: Welcome, then sign in, then the role switcher, then the role's home. */
export default function Index() {
  const { welcomed, phone, role } = useSession();
  const target: Href = !welcomed
    ? '/welcome'
    : !phone
      ? '/login'
      : !role
        ? '/roles'
        : ROLE_HOME[role];
  return <Redirect href={target} />;
}
