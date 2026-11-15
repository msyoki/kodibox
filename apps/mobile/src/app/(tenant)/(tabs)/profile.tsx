import { LANDLORD_NAME, PROPERTY_LABEL, TENANT_NAME, DEMO_TENANT_ID } from '@kodibox/demo';
import { useState } from 'react';
import { View } from 'react-native';
import { SignOutButton, useSignOut } from '@/components/account';
import { Button, Chips, Field, ToggleRow } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { Dialog, useToast } from '@/components/overlays';
import { AppText, Card, Divider, Mark, Section } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { ThemeToggle } from '@/components/theme-toggle';
import { maskPhone } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { useDemo } from '@/state/demo-state';

export default function Profile() {
  const go = useGo();
  const toast = useToast();
  const signOut = useSignOut();
  const { data } = useDemo();
  const { phone } = useSession();
  const tenant = data.tenants.find((t) => t.id === DEMO_TENANT_ID);

  const [sms, setSms] = useState(!tenant?.smsOptOut);
  const [push, setPush] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [lang, setLang] = useState<'English' | 'Kiswahili'>('English');
  const [fingerprint, setFingerprint] = useState(true);
  const [devices, setDevices] = useState([
    { id: 'd1', name: 'This phone (Android)', current: true },
    { id: 'd2', name: 'Tecno Spark (last seen 28 Oct)', current: false },
  ]);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correction, setCorrection] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);

  return (
    <Screen tabs title="Profile">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Mark>PO</Mark>
        <View>
          <AppText variant="h1">{TENANT_NAME}</AppText>
          <AppText variant="caption">{PROPERTY_LABEL}</AppText>
          {(phone ?? tenant?.phone) ? (
            <AppText variant="small">{maskPhone((phone ?? tenant?.phone) as string)}</AppText>
          ) : null}
        </View>
      </View>

      <Section title="Appearance">
        <Card>
          <ThemeToggle />
        </Card>
      </Section>

      <Section title="Notifications and consents">
        <Card style={{ paddingVertical: 4 }}>
          <ToggleRow
            label="Rent reminders by SMS"
            value={sms}
            onChange={(v) => {
              setSms(v);
              toast(v ? 'SMS reminders on' : 'SMS reminders off', 'info');
            }}
          />
          <Divider />
          <ToggleRow label="Rent reminders by push" value={push} onChange={setPush} />
          <Divider />
          <ToggleRow
            label="Marketing and offers"
            hint="Off unless you opt in"
            value={marketing}
            onChange={setMarketing}
          />
        </Card>
        <AppText variant="caption">
          You can also reply STOP to any Kodibox SMS to opt out of reminders. Receipts and legal
          notices are always sent. Consent choices are recorded with the date.
        </AppText>
      </Section>

      <Section title="Language">
        <Chips
          options={['English', 'Kiswahili']}
          value={lang}
          onChange={(l) => {
            setLang(l);
            toast(`Language set to ${l}`, 'info');
          }}
        />
      </Section>

      <Section title="Security">
        <Card style={{ paddingVertical: 4 }}>
          <ToggleRow label="Fingerprint lock" value={fingerprint} onChange={setFingerprint} />
          <Divider />
          <ListRow
            boxed={false}
            title="Signed-in devices"
            right={<AppText variant="small">{devices.length} devices</AppText>}
            onPress={() => setDevicesOpen(true)}
          />
        </Card>
      </Section>

      <Section title="Your data (Data Protection Act)">
        <Card style={{ paddingVertical: 4 }}>
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
          <Divider />
          <ListRow
            boxed={false}
            title="Delete my account"
            subtitle="Personal details removed. Payment records kept as the law requires."
            onPress={() => setDeleteOpen(true)}
          />
        </Card>
      </Section>

      <Card style={{ paddingVertical: 4 }}>
        <ListRow
          boxed={false}
          title="Help and contact landlord"
          right={<AppText variant="small">{LANDLORD_NAME}</AppText>}
          onPress={() => toast(`Opening a chat with ${LANDLORD_NAME} (demo)`, 'info')}
        />
      </Card>

      <Button label="Switch role" variant="secondary" onPress={() => go.replace('/roles')} />
      <SignOutButton />

      <Dialog
        open={devicesOpen}
        onClose={() => setDevicesOpen(false)}
        title="Signed-in devices"
        footer={<Button label="Done" onPress={() => setDevicesOpen(false)} />}
      >
        {devices.map((d) => (
          <View
            key={d.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <AppText style={{ flex: 1 }}>{d.name}</AppText>
            {d.current ? (
              <AppText variant="caption">Current</AppText>
            ) : (
              <Button
                label="Sign out"
                size="sm"
                variant="secondary"
                accessibilityLabel={`Sign out ${d.name}`}
                onPress={() => {
                  setDevices((ds) => ds.filter((x) => x.id !== d.id));
                  toast('Device signed out', 'ok');
                }}
              />
            )}
          </View>
        ))}
      </Dialog>

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

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete my account?"
        description="Your personal details will be removed. Payment records are kept for the period the law requires, so your landlord's books stay correct. This cannot be undone."
        footer={
          <>
            <Button label="Keep my account" variant="ghost" onPress={() => setDeleteOpen(false)} />
            <Button
              label="Delete account"
              variant="danger"
              onPress={() => {
                setDeleteOpen(false);
                toast('Deletion requested. You have been signed out.', 'warn');
                signOut();
              }}
            />
          </>
        }
      />
    </Screen>
  );
}
