import {
  DEMO_TENANT_ID,
  RECENT_RECEIPTS,
  formatDate,
  getTenantDetail,
  shortDay,
} from '@kodibox/demo';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Button, Row } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { INVOICE_TONE, OpenOnWeb, cap } from '@/components/manager-ui';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Badge, Card, EmptyState, Section } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { maskPhone } from '@/lib/phone';
import { useDemo } from '@/state/demo-state';

export default function TenantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const go = useGo();
  const toast = useToast();
  const { data } = useDemo();
  const d = id ? getTenantDetail(data, id) : undefined;
  if (!d) {
    return (
      <Screen title="Tenant" back="/tenants">
        <EmptyState title="Tenant not found" />
      </Screen>
    );
  }
  const { tenant, lease, unit, property } = d;
  const receipts =
    tenant.id === DEMO_TENANT_ID && d.payments.length === 0
      ? RECENT_RECEIPTS.map((x) => ({
          key: x.ref,
          at: x.paidAt.slice(0, 10),
          label: `Payment ${x.ref}`,
          amount: x.amount,
          credit: true,
        }))
      : [];
  const statement = [
    ...receipts,
    ...d.invoices.map((i) => ({
      key: i.id,
      at: i.issueDate,
      label: `Invoice ${i.number}`,
      amount: i.total,
      credit: false,
    })),
    ...d.payments
      .filter((p) => p.status !== 'rejected')
      .map((p) => ({
        key: p.id,
        at: p.receivedAt.slice(0, 10),
        label: `Payment ${p.reference}`,
        amount: p.amount,
        credit: true,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);
  return (
    <Screen title={tenant.name} eyebrow={`${unit.code} · ${property.name}`} back="/tenants">
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="small">Balance</AppText>
            <Amount minor={tenant.balance} size="lg" tone={tenant.balance > 0n ? 'warn' : 'ok'} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="small">Next due</AppText>
            <AppText variant="strong">
              {d.nextDueDate ? formatDate(d.nextDueDate) : 'Nothing due'}
            </AppText>
          </View>
        </View>
        <AppText variant="small">
          Phone {maskPhone(tenant.phone)} · ID ••••{tenant.nationalId.slice(-3)}
        </AppText>
        <Row>
          <Button
            label="Call"
            variant="secondary"
            style={{ flex: 1 }}
            accessibilityLabel={`Call ${tenant.name}`}
            onPress={() => toast(`Calling ${tenant.name}...`, 'info')}
          />
          <Button
            label="SMS"
            variant="secondary"
            style={{ flex: 1 }}
            accessibilityLabel={`Send SMS to ${tenant.name}`}
            onPress={() =>
              tenant.smsOptOut
                ? toast(`${tenant.name} opted out of SMS. Use a call instead.`, 'warn')
                : go.push(`/manage/messages?to=${tenant.id}`)
            }
          />
        </Row>
        {tenant.smsOptOut ? <Badge tone="warn">Opted out of SMS</Badge> : null}
      </Card>

      <Section title="Lease">
        <Card style={{ gap: 4 }}>
          <AppText variant="strong">
            {formatDate(lease.startDate)} to {formatDate(lease.endDate)}
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="small">Rent</AppText>
            <Amount minor={lease.rent} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="small">Deposit</AppText>
            <Amount minor={lease.deposit} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Badge tone={lease.status === 'active' ? 'ok' : 'warn'}>{cap(lease.status)}</Badge>
          </View>
        </Card>
        <OpenOnWeb what="Writing or renewing a lease is a desk task on the web app." />
      </Section>

      <Section title="Invoices">
        {d.invoices.length === 0 ? <AppText variant="small">No invoices yet.</AppText> : null}
        <View style={{ gap: 8 }}>
          {d.invoices.map((i) => (
            <ListRow
              key={i.id}
              title={i.number}
              subtitle={`Due ${shortDay(i.dueDate)}`}
              right={
                <>
                  <Amount minor={i.total} />
                  <Badge tone={INVOICE_TONE[i.status]}>{cap(i.status)}</Badge>
                </>
              }
              onPress={() => go.push(`/manage/invoices/${i.id}`)}
            />
          ))}
        </View>
      </Section>

      <Section title="Statement">
        <Card style={{ gap: 10 }}>
          {statement.length === 0 ? <AppText variant="small">No activity yet.</AppText> : null}
          {statement.map((r) => (
            <View
              key={r.key}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="strong" style={{ fontSize: 14 }}>
                  {r.label}
                </AppText>
                <AppText variant="caption">{shortDay(r.at)}</AppText>
              </View>
              <Amount minor={r.amount} {...(r.credit ? { tone: 'ok' as const } : {})} />
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
