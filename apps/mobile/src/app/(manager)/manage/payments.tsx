import { shortDay, type PaymentChannel } from '@kodibox/demo';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Chips, Row } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Badge, Card, EmptyState } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { receiptLabel } from '@/lib/format';
import { useDemo } from '@/state/demo-state';

const VIEWS = ['Recent', 'Unmatched', 'Cash'] as const;

const CHANNEL: Record<PaymentChannel, string> = {
  mpesa_paybill: 'M-Pesa',
  mpesa_stk: 'M-Pesa',
  bank: 'Bank',
  cash: 'Cash',
};

export default function Payments() {
  const go = useGo();
  const toast = useToast();
  const { data, cash, setCashStatus, importLines, importDecisions } = useDemo();
  const [view, setView] = useState<(typeof VIEWS)[number]>('Recent');

  const recent = useMemo(
    () =>
      [...data.payments]
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
        .slice(0, 25)
        .map((p) => ({
          ...p,
          tenantName: data.tenants.find((t) => t.id === p.tenantId)?.name ?? '',
          unitCode: data.units.find((u) => u.id === p.unitId)?.code ?? '',
        })),
    [data],
  );
  const openLines = importLines.filter((l) => !importDecisions[l.id]);
  const pendingCash = cash.filter((c) => c.status === 'awaiting_approval');

  return (
    <Screen title="Payments" back="/more">
      <AppText variant="small">
        Payments go straight to your paybill, till or bank account. Kodibox only reconciles
        statements, tenant proofs and cash entries.
      </AppText>
      <ListRow
        icon="cloud-upload-outline"
        title="Import statement"
        subtitle="M-Pesa or bank statement. Done on the web app."
        onPress={() => go.push('/manage/import')}
      />
      <Chips label="Show" options={VIEWS} value={view} onChange={setView} />

      {view === 'Recent' ? (
        <View style={{ gap: 8 }}>
          {recent.map((p) => (
            <ListRow
              key={p.id}
              title={`${p.unitCode} · ${p.tenantName}`}
              monoSubtitle
              subtitle={`${CHANNEL[p.channel]} · ${p.reference} · ${shortDay(p.receivedAt)}`}
              right={
                <>
                  <Amount minor={p.amount} />
                  {p.status === 'awaiting_approval' ? <Badge tone="warn">To approve</Badge> : null}
                </>
              }
            />
          ))}
        </View>
      ) : null}

      {view === 'Unmatched' ? (
        <View style={{ gap: 8 }}>
          {openLines.length === 0 ? <EmptyState title="Every statement line is matched" /> : null}
          {openLines.map((u) => (
            <ListRow
              key={u.id}
              title={`${u.code} · ${u.payerName}`}
              subtitle={`${shortDay(u.paidAt)} · account "${u.accountRef || 'none'}"`}
              right={<Amount minor={u.amount} prefix={false} />}
              onPress={() => go.push('/approvals')}
            />
          ))}
          {openLines.length > 0 ? (
            <AppText variant="caption">Tap a line to review it in Approvals.</AppText>
          ) : null}
        </View>
      ) : null}

      {view === 'Cash' ? (
        <View style={{ gap: 8 }}>
          {pendingCash.length === 0 ? <EmptyState title="No cash entries waiting" /> : null}
          {pendingCash.map((p) => (
            <Card key={p.id} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="strong">
                    {p.unitCode} · {p.tenantName}
                  </AppText>
                  <AppText variant="caption">
                    {p.recordedBy} · {receiptLabel(p.reference)}
                  </AppText>
                </View>
                <Amount minor={p.amount} strong />
              </View>
              <Row>
                <Button
                  label="Reject"
                  variant="secondary"
                  style={{ flex: 1 }}
                  accessibilityLabel={`Reject cash ${p.reference}`}
                  onPress={() => {
                    setCashStatus(p.id, 'rejected');
                    toast(`Rejected ${p.reference}`, 'warn');
                  }}
                />
                <Button
                  label="Approve"
                  style={{ flex: 1 }}
                  accessibilityLabel={`Approve cash ${p.reference}`}
                  onPress={() => {
                    setCashStatus(p.id, 'matched');
                    toast(`Approved ${p.reference}`, 'ok');
                  }}
                />
              </Row>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
