import { CARETAKER_NAME, MANAGER_NAME, TENANT_NAME } from '@kodibox/demo';
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Field, ToggleRow } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { Dialog, useToast } from '@/components/overlays';
import { AppText, Badge, Card, Divider, Mark, Section } from '@/components/primitives';
import { useGo } from '@/components/screen';
import { ThemeToggle } from '@/components/theme-toggle';
import { maskPhone } from '@/lib/phone';
import { useSession, type Role } from '@/lib/session';
import { useDemo } from '@/state/demo-state';

const ROLE_LABEL: Record<Role, string> = {
  tenant: 'Tenant',
  caretaker: 'Caretaker',
  manager: 'Property manager',
};

const ROLE_NAME: Record<Role, string> = {
  tenant: TENANT_NAME,
  caretaker: CARETAKER_NAME,
  manager: MANAGER_NAME,
};

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Clears the demo session, then resets navigation so Back cannot return into the app. */
export function useSignOut(): () => void {
  const router = useRouter();
  const { signOut } = useSession();
  return () => {
    signOut();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login' as Href);
  };
}

/** Sign out button with a confirm dialog. Used on every role's account screen. */
export function SignOutButton({ variant = 'danger' }: { variant?: 'danger' | 'ghost' }) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  return (
    <>
      <Button label="Sign out" variant={variant} size="lg" onPress={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sign out of Kodibox?"
        description="You will return to the sign-in screen. Entries not yet synced stay on this phone."
        footer={
          <>
            <Button label="Stay signed in" variant="ghost" onPress={() => setOpen(false)} />
            <Button
              label="Sign out"
              variant="danger"
              onPress={() => {
                setOpen(false);
                signOut();
              }}
            />
          </>
        }
      />
    </>
  );
}

/** Switch role entry (demo only; the real role comes from the server session). */
export function SwitchRoleButton() {
  const go = useGo();
  return <Button label="Switch role" variant="secondary" onPress={() => go.replace('/roles')} />;
}

/** Light, dark or system: lives on every role's account screen. */
export function AppearanceSection() {
  return (
    <Section title="Appearance">
      <Card>
        <ThemeToggle />
      </Card>
    </Section>
  );
}

function PrivacySection() {
  const toast = useToast();
  const [exportRequested, setExportRequested] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correction, setCorrection] = useState('');
  const [consent, setConsent] = useState(true);
  return (
    <Section title="Privacy and data">
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow
          label="Processing for service messages"
          hint="Needed to run your account. Recorded with the date."
          value={consent}
          onChange={(v) => {
            setConsent(v);
            toast(v ? 'Consent recorded' : 'Consent withdrawn. Some features may stop.', 'info');
          }}
        />
        <Divider />
        <ListRow
          boxed={false}
          title={exportRequested ? 'Data export requested' : 'Download my data'}
          subtitle={
            exportRequested
              ? 'We will send it within 30 days.'
              : 'Get a copy of what we hold about you'
          }
          onPress={() => {
            setExportRequested(true);
            toast('Data export requested. We will send it within 30 days.', 'ok');
          }}
        />
        <Divider />
        <ListRow
          boxed={false}
          title="Request a correction"
          subtitle="Tell us what is wrong in your details"
          onPress={() => setCorrectionOpen(true)}
        />
      </Card>
      <Dialog
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        title="Request a correction"
        description="Tell us what is wrong in your details. We reply within 30 days."
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setCorrectionOpen(false)} />
            <Button
              label="Send request"
              disabled={correction.trim().length < 3}
              onPress={() => {
                setCorrectionOpen(false);
                setCorrection('');
                toast('Correction request received', 'ok');
              }}
            />
          </>
        }
      >
        <Field
          label="What should be corrected?"
          value={correction}
          onChangeText={setCorrection}
          multiline
          placeholder="For example: my name is spelled Otieno, not Otiano"
        />
      </Dialog>
    </Section>
  );
}

/**
 * Account screen body for caretaker and manager: profile, preferences, security, privacy, help,
 * about and Sign out. `extra` is rendered under the profile card (the manager's module list).
 */
export function AccountBody({ role, extra }: { role: Role; extra?: ReactNode }) {
  const toast = useToast();
  const { phone } = useSession();
  const { data } = useDemo();
  const [push, setPush] = useState(true);
  const [sms, setSms] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const name = ROLE_NAME[role];
  const twoFactorRequired = role === 'manager';
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Mark>{initialsOf(name)}</Mark>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="h1">{name}</AppText>
          <AppText variant="small">
            {ROLE_LABEL[role]} · {data.org.name}
          </AppText>
          {phone ? <AppText variant="small">{maskPhone(phone)}</AppText> : null}
        </View>
      </Card>

      {extra}

      <AppearanceSection />

      <Section title="Notifications">
        <Card style={{ paddingVertical: 4 }}>
          <ToggleRow label="Push alerts" value={push} onChange={setPush} />
          <Divider />
          <ToggleRow
            label="SMS alerts"
            hint="Reply STOP to any Kodibox SMS to opt out."
            value={sms}
            onChange={setSms}
          />
        </Card>
      </Section>

      <Section title="Security">
        <Card style={{ paddingVertical: 4 }}>
          <ToggleRow label="Biometric unlock" value={biometric} onChange={setBiometric} />
          <Divider />
          <ListRow
            boxed={false}
            title="Two-factor sign-in"
            subtitle={
              twoFactorRequired ? 'Required for managers and owners' : 'Optional for caretakers'
            }
            right={
              <Badge tone={twoFactorRequired ? 'ok' : 'neutral'}>
                {twoFactorRequired ? 'On' : 'Off'}
              </Badge>
            }
            onPress={() =>
              toast(
                twoFactorRequired
                  ? 'Two-factor is required for your role and stays on'
                  : 'Two-factor setup is on the web app (demo)',
                'info',
              )
            }
          />
        </Card>
      </Section>

      <PrivacySection />

      <Section title="Help and about">
        <Card style={{ paddingVertical: 4 }}>
          <ListRow
            boxed={false}
            title="Help and support"
            subtitle="Chat with Kodibox support (demo)"
            onPress={() => toast('Support chat opens here (demo)', 'info')}
          />
          <Divider />
          <ListRow
            boxed={false}
            title="About Kodibox"
            right={<AppText variant="small">Version {version}</AppText>}
          />
        </Card>
      </Section>

      <SwitchRoleButton />
      <SignOutButton />
    </>
  );
}
