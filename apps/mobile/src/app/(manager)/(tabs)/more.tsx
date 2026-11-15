import { View } from 'react-native';
import { AccountBody } from '@/components/account';
import { ListRow } from '@/components/list-row';
import { Card, Section } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';

const MODULES = [
  {
    title: 'Portfolio',
    items: [
      { icon: 'business-outline', label: 'Properties and units', to: '/manage/properties' },
      { icon: 'people-outline', label: 'Tenants and leases', to: '/tenants' },
    ],
  },
  {
    title: 'Money',
    items: [
      { icon: 'document-text-outline', label: 'Invoices', to: '/manage/invoices' },
      { icon: 'card-outline', label: 'Payments', to: '/manage/payments' },
      { icon: 'water-outline', label: 'Utilities', to: '/manage/utilities' },
      { icon: 'receipt-outline', label: 'Expenses and repairs', to: '/manage/maintenance' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: 'chatbubble-ellipses-outline', label: 'Tickets', to: '/manage/tickets' },
      { icon: 'exit-outline', label: 'Notices and move-outs', to: '/manage/move-outs' },
      { icon: 'mail-outline', label: 'Messages', to: '/manage/messages' },
    ],
  },
  {
    title: 'Owners and reports',
    items: [
      { icon: 'person-outline', label: 'Landlords', to: '/manage/landlords' },
      { icon: 'bar-chart-outline', label: 'Reports and tax', to: '/manage/reports' },
      { icon: 'settings-outline', label: 'Organization settings', to: '/manage/org-settings' },
    ],
  },
] as const;

/** Manager's "More" tab: every web module, then account, preferences and Sign out. */
export default function ManagerMore() {
  const go = useGo();
  return (
    <Screen tabs title="More">
      <AccountBody
        role="manager"
        extra={MODULES.map((g) => (
          <Section key={g.title} title={g.title}>
            <Card style={{ paddingVertical: 4 }}>
              {g.items.map((i) => (
                <View key={i.to}>
                  <ListRow
                    boxed={false}
                    icon={i.icon}
                    title={i.label}
                    onPress={() => go.push(i.to)}
                  />
                </View>
              ))}
            </Card>
          </Section>
        ))}
      />
    </Screen>
  );
}
