import { Redirect } from 'expo-router';
import { useSession } from '@/lib/session';

/** Legacy shortcut: Settings now live in each role's Account / More / Profile tab. */
export default function Settings() {
  const { role } = useSession();
  const target =
    role === 'manager'
      ? '/more'
      : role === 'caretaker'
        ? '/account'
        : role === 'tenant'
          ? '/profile'
          : '/';
  return <Redirect href={target} />;
}
