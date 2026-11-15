import { View } from 'react-native';
import { Amount, AppText, Badge, Card, EmptyState } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { OpenOnWeb, cap } from '@/components/manager-ui';
import { maskPhone } from '@/lib/phone';
import { useDemo } from '@/state/demo-state';

/** Read-only landlord payout summary. Kodibox records what is owed; the landlord is paid from your own account. */
export default function Landlords() {
  const { data } = useDemo();
  return (
    <Screen title="Landlords" back="/more">
      {data.landlords.length === 0 ? <EmptyState title="No landlords" /> : null}
      {data.landlords.map((l) => {
        const latest = data.remittances
          .filter((r) => r.landlordId === l.id)
          .sort((a, b) => b.period.localeCompare(a.period))[0];
        const names = data.properties
          .filter((p) => l.propertyIds.includes(p.id))
          .map((p) => p.name);
        return (
          <Card key={l.id} style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="h2">{l.name}</AppText>
                <AppText variant="caption">
                  {names.join(', ')} · {maskPhone(l.phone)}
                </AppText>
              </View>
              <Badge>{`${l.commissionPct}% fee`}</Badge>
            </View>
            <AppText variant="small">
              Payout by {l.payoutMethod === 'bank' ? 'bank' : 'M-Pesa'}
            </AppText>
            {latest ? (
              <View style={{ gap: 4 }}>
                <AppText variant="caption">Statement {latest.period}</AppText>
                <Row label="Gross rent" minor={latest.gross} />
                <Row label="Commission" minor={latest.commission} />
                <Row label="Expenses" minor={latest.expenses} />
                <Row label="Net to landlord" minor={latest.net} strong />
                <View style={{ flexDirection: 'row' }}>
                  <Badge tone={latest.status === 'remitted' ? 'ok' : 'warn'}>
                    {cap(latest.status)}
                  </Badge>
                </View>
              </View>
            ) : (
              <AppText variant="small">No statements yet.</AppText>
            )}
          </Card>
        );
      })}
      <OpenOnWeb what="Recording payouts and sending statements are done on the web app." />
    </Screen>
  );
}

function Row({ label, minor, strong }: { label: string; minor: bigint; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText variant={strong ? 'strong' : 'small'}>{label}</AppText>
      <Amount minor={minor} {...(strong ? { strong: true } : {})} />
    </View>
  );
}
