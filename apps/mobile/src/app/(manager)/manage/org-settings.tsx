import { View } from 'react-native';
import { KeyValueList } from '@/components/key-value';
import { OpenOnWeb, cap } from '@/components/manager-ui';
import { AppText, Badge, Card, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { formatNairobiDateTime } from '@/lib/format';
import { PAY_INSTRUCTIONS } from '@/lib/pay-instructions';
import { useDemo } from '@/state/demo-state';

/** Organization settings, read-only on the phone. */
export default function OrgSettings() {
  const { data } = useDemo();
  const plan = data.plans.find((p) => p.id === data.org.plan);
  return (
    <Screen title="Organization settings" back="/more">
      <Card>
        <KeyValueList
          rows={[
            { label: 'Organization', value: data.org.name },
            { label: 'Owner', value: data.org.ownerName },
            {
              label: 'Plan',
              value: plan ? `${plan.name} (up to ${plan.unitLimit} units)` : cap(data.org.plan),
            },
            { label: 'SMS sender', value: data.org.smsSenderId },
          ]}
        />
      </Card>
      <Section title="Payment instructions">
        <Card style={{ gap: 8 }}>
          <AppText variant="caption">
            What tenants see under How to pay. Rent goes straight to you. Kodibox never collects it.
          </AppText>
          <KeyValueList
            rows={[
              { label: 'Paybill', value: PAY_INSTRUCTIONS.paybill, mono: true },
              { label: 'Till', value: PAY_INSTRUCTIONS.till, mono: true },
              { label: 'Bank', value: PAY_INSTRUCTIONS.bankName },
              { label: 'Bank account', value: PAY_INSTRUCTIONS.bankAccount, mono: true },
              { label: 'Account reference', value: 'Unit code, e.g. B-12', mono: true },
            ]}
          />
        </Card>
      </Section>
      <Section title="Team">
        <View style={{ gap: 8 }}>
          {data.members.map((m) => (
            <Card key={m.id} style={{ gap: 4, padding: 12 }}>
              <KeyValueList
                rows={[
                  { label: m.name, value: cap(m.role) },
                  {
                    label: 'Two-factor',
                    value: (
                      <Badge tone={m.twoFactor ? 'ok' : 'warn'}>{m.twoFactor ? 'On' : 'Off'}</Badge>
                    ),
                  },
                  { label: 'Last active', value: formatNairobiDateTime(m.lastActive) },
                ]}
              />
            </Card>
          ))}
        </View>
      </Section>
      <OpenOnWeb what="Team, billing, payment instructions and audit log are managed on the web app." />
    </Screen>
  );
}
