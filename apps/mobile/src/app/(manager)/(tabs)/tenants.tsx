import {
  DEMO_TENANT_ID,
  RECENT_RECEIPTS,
  formatDate,
  getQuickCard,
  searchTenants,
} from '@kodibox/demo';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Row } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Card } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { maskPhone } from '@/lib/phone';
import { useDemo } from '@/state/demo-state';

export default function ManagerTenants() {
  const go = useGo();
  const toast = useToast();
  const { data } = useDemo();
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(DEMO_TENANT_ID);
  const rows = useMemo(() => searchTenants(data, q), [data, q]);
  const card = useMemo(() => {
    const c = getQuickCard(data, selectedId);
    // The tenant app shows RECENT_RECEIPTS for this persona, so the manager's view reads the same source.
    const latest = RECENT_RECEIPTS[0];
    if (c && c.lastPaymentAmount === undefined && selectedId === DEMO_TENANT_ID && latest) {
      return {
        ...c,
        lastPaymentAmount: latest.amount,
        lastPaymentLabel: `${latest.when} · ${latest.ref}`,
      };
    }
    return c;
  }, [data, selectedId]);

  return (
    <Screen tabs title="Tenants">
      <Field
        label="Search tenants"
        value={q}
        onChangeText={setQ}
        placeholder="Search by name or unit"
        autoCapitalize="none"
        returnKeyType="search"
      />
      <View style={{ gap: 8 }}>
        {rows.length === 0 ? (
          <AppText variant="small">No tenants match &quot;{q}&quot;.</AppText>
        ) : null}
        {rows.map((t) => (
          <ListRow
            key={t.id}
            title={t.name}
            subtitle={`${t.unitCode} · ${t.propertyName}`}
            selected={t.id === selectedId}
            right={
              <Amount
                minor={t.balance}
                prefix={false}
                {...(t.balance > 0n ? { tone: 'warn' as const } : { tone: 'ok' as const })}
              />
            }
            onPress={() => setSelectedId(t.id)}
          />
        ))}
      </View>

      {card ? (
        <Card style={{ gap: 12 }}>
          <View>
            <AppText variant="h1">{card.tenant.name}</AppText>
            <AppText variant="small">
              {card.tenant.unitCode} · {card.tenant.propertyName} · {maskPhone(card.tenant.phone)}
            </AppText>
            {card.nextDueDate ? (
              <AppText variant="caption" style={{ marginTop: 4 }}>
                Due {formatDate(card.nextDueDate)}
              </AppText>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="small">Balance</AppText>
              <Amount minor={card.tenant.balance} strong />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="small">Last payment</AppText>
              {card.lastPaymentAmount !== undefined ? (
                <>
                  <Amount minor={card.lastPaymentAmount} prefix={false} strong />
                  <AppText variant="caption">{card.lastPaymentLabel}</AppText>
                </>
              ) : (
                <AppText variant="strong">None yet</AppText>
              )}
            </View>
          </View>
          <Row>
            <Button
              label="Call"
              variant="secondary"
              style={{ flex: 1 }}
              accessibilityLabel={`Call ${card.tenant.name}`}
              onPress={() => toast(`Calling ${card.tenant.name}...`, 'info')}
            />
            <Button
              label="SMS"
              variant="secondary"
              style={{ flex: 1 }}
              accessibilityLabel={`Send SMS to ${card.tenant.name}`}
              onPress={() =>
                card.tenant.smsOptOut
                  ? toast(`${card.tenant.name} opted out of SMS. Use a call instead.`, 'warn')
                  : toast(`SMS composer opened for ${card.tenant.name}`, 'info')
              }
            />
          </Row>
          <Button
            label={card.tenant.balance > 0n ? 'Send payment reminder' : 'No balance to remind'}
            disabled={card.tenant.balance <= 0n || card.tenant.smsOptOut}
            onPress={() =>
              toast(
                `Reminder sent to ${card.tenant.name} with pay instructions and account ${card.tenant.unitCode}.`,
                'ok',
              )
            }
          />
          <Button
            label="Open full profile and statement"
            variant="ghost"
            onPress={() => go.push(`/manage/tenant/${card.tenant.id}`)}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
