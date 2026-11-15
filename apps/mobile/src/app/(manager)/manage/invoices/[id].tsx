import { formatDate } from '@kodibox/demo';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/controls';
import { INVOICE_TONE, OpenOnWeb, cap } from '@/components/manager-ui';
import { useToast } from '@/components/overlays';
import {
  Amount,
  AppText,
  Badge,
  Card,
  Divider,
  EmptyState,
  Section,
} from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { useDemo } from '@/state/demo-state';

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const go = useGo();
  const toast = useToast();
  const { data } = useDemo();
  const inv = data.invoices.find((i) => i.id === id);
  if (!inv) {
    return (
      <Screen title="Invoice" back="/manage/invoices">
        <EmptyState title="Invoice not found" />
      </Screen>
    );
  }
  const tenant = data.tenants.find((t) => t.id === inv.tenantId);
  const unit = data.units.find((u) => u.id === inv.unitId);
  const payments = data.payments.filter((p) => p.invoiceId === inv.id);
  return (
    <Screen
      title={inv.number}
      eyebrow={`${unit?.code ?? ''} · ${tenant?.name ?? ''}`}
      back="/manage/invoices"
    >
      <Card style={{ gap: 8 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Badge tone={INVOICE_TONE[inv.status]}>{cap(inv.status)}</Badge>
          <AppText variant="small">Due {formatDate(inv.dueDate)}</AppText>
        </View>
        <AppText variant="small">Balance</AppText>
        <Amount minor={inv.balance} size="xl" tone={inv.balance > 0n ? 'warn' : 'ok'} />
      </Card>
      <Section title="Charges">
        <Card style={{ gap: 10 }}>
          {inv.lines.map((l, idx) => (
            <View
              key={`${l.label}-${idx}`}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}
            >
              <AppText style={{ flex: 1 }}>{l.label}</AppText>
              <Amount minor={l.amount} />
            </View>
          ))}
          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="strong">Total</AppText>
            <Amount minor={inv.total} strong />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="small">Paid</AppText>
            <Amount minor={inv.paid} tone="ok" />
          </View>
        </Card>
      </Section>
      <Section title="Payments on this invoice">
        {payments.length === 0 ? <AppText variant="small">No payments yet.</AppText> : null}
        {payments.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText>{p.reference}</AppText>
            <Amount minor={p.amount} tone="ok" />
          </View>
        ))}
      </Section>
      {tenant ? (
        <View style={{ gap: 8 }}>
          <Button
            label="View tenant"
            variant="secondary"
            onPress={() => go.push(`/manage/tenant/${tenant.id}`)}
          />
          <Button
            label={inv.balance > 0n ? 'Send payment reminder' : 'Fully paid'}
            disabled={inv.balance <= 0n}
            onPress={() =>
              tenant.smsOptOut
                ? toast(`${tenant.name} opted out of SMS. Use a call instead.`, 'warn')
                : toast(
                    `Reminder queued for ${tenant.name}. They pay straight to your paybill.`,
                    'ok',
                  )
            }
          />
        </View>
      ) : null}
      <OpenOnWeb what="Editing charges, credit notes and PDF invoices are on the web app." />
    </Screen>
  );
}
