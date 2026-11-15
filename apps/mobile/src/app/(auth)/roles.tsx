import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/controls';
import type { IconName } from '@/components/icon';
import { ListRow } from '@/components/list-row';
import { AppText } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { maskPhone } from '@/lib/phone';
import { ROLE_HOME, useSession, type Role } from '@/lib/session';

const PERSONAS: { role: Role; name: string; who: string; blurb: string; icon: IconName }[] = [
  {
    role: 'tenant',
    name: 'Tenant',
    who: 'Peter Otieno, B-12 Riverside Court',
    blurb: 'Balance, how to pay, proof of payment, statements, repair requests.',
    icon: 'home-outline',
  },
  {
    role: 'caretaker',
    name: 'Caretaker',
    who: 'Otieno Ouma, Baraka Flats and Mvule',
    blurb: 'Tasks, meter readings, cash collection, jobs.',
    icon: 'key-outline',
  },
  {
    role: 'manager',
    name: 'Manager',
    who: 'Wanjiru Mwangi, Mwangi Properties',
    blurb: 'Approvals, tenants and alerts on the go.',
    icon: 'briefcase-outline',
  },
];

export default function Roles() {
  const go = useGo();
  const { phone, chooseRole, signOut } = useSession();
  if (!phone) return <Redirect href="/login" />;

  return (
    <Screen title="Continue as" eyebrow={maskPhone(phone)}>
      <AppText variant="small">
        Demo role switcher. Once sign-in is real, the server decides which roles you have.
      </AppText>
      <View style={{ gap: 12 }}>
        {PERSONAS.map((p) => (
          <ListRow
            key={p.role}
            icon={p.icon}
            title={p.name}
            subtitle={`${p.who}\n${p.blurb}`}
            accessibilityLabel={`Continue as ${p.name}, ${p.who}`}
            onPress={() => {
              chooseRole(p.role);
              go.replace(ROLE_HOME[p.role]);
            }}
          />
        ))}
      </View>
      <Button
        label="Use a different number"
        variant="secondary"
        onPress={() => {
          signOut();
          go.replace('/login');
        }}
      />
    </Screen>
  );
}
