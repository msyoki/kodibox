import {
  BALANCE,
  RECENT_RECEIPTS,
  DEMO_TENANT_ID,
  LANDLORD_NAME,
  PAYBILL_PLACEHOLDER,
  TENANT_ACCOUNT,
  allocatePayment,
} from '@kodibox/demo';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Button, Row } from '@/components/controls';
import { Icon } from '@/components/icon';
import { KeyValueList } from '@/components/key-value';
import { Amount, AppText, Card, Divider } from '@/components/primitives';
import { useToast } from '@/components/overlays';
import { Screen, useGo } from '@/components/screen';
import type { CashEntry } from '@kodibox/demo';
import type { Claim } from '@/lib/payments-engine';
import { formatNairobiDateTime } from '@/lib/format';
import { maskPhone } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { useDemo } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';

type ReceiptSource = 'Statement import' | 'Verified claim' | 'Cash';

interface ReceiptView {
  amount: bigint;
  code: string;
  paidAt: string;
  source: ReceiptSource;
}

/** Receipt shown for a statement receipt, a verified claim or an approved cash entry. */
function resolveReceipt(
  id: string | undefined,
  claims: readonly Claim[],
  cash: readonly CashEntry[],
): ReceiptView {
  const [kind, ref] = (id ?? '').split(':');
  // Ownership: a receipt link only resolves records that belong to the signed-in tenant,
  // so a crafted deep link can't show another tenant's payment as a receipt.
  if (kind === 'claim') {
    const c = claims.find((x) => x.id === ref && x.tenantId === DEMO_TENANT_ID);
    if (c && (c.status === 'approved' || c.status === 'verified_statement')) {
      return {
        amount: c.amount,
        code: c.code,
        paidAt: c.paidAt,
        source: c.status === 'verified_statement' ? 'Statement import' : 'Verified claim',
      };
    }
  }
  if (kind === 'cash') {
    const c = cash.find((x) => x.id === ref && x.unitCode === TENANT_ACCOUNT);
    if (c && c.status === 'matched')
      return { amount: c.amount, code: c.reference, paidAt: c.receivedAt, source: 'Cash' };
  }
  const recent = RECENT_RECEIPTS.find((x) => x.ref === ref);
  if (recent) {
    return {
      amount: recent.amount,
      code: recent.ref,
      paidAt: recent.paidAt,
      source: 'Statement import',
    };
  }
  const latest = claims
    .filter(
      (c) =>
        c.by === 'tenant' &&
        c.tenantId === DEMO_TENANT_ID &&
        (c.status === 'approved' || c.status === 'verified_statement'),
    )
    .at(0);
  if (latest) {
    return {
      amount: latest.amount,
      code: latest.code,
      paidAt: latest.paidAt,
      source: latest.status === 'verified_statement' ? 'Statement import' : 'Verified claim',
    };
  }
  const first = RECENT_RECEIPTS[0];
  return first
    ? { amount: first.amount, code: first.ref, paidAt: first.paidAt, source: 'Statement import' }
    : { amount: BALANCE, code: '-', paidAt: new Date().toISOString(), source: 'Cash' };
}

export default function Receipt() {
  const go = useGo();
  const { colors } = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, claims, cash } = useDemo();
  const tenant = data.tenants.find((t) => t.id === DEMO_TENANT_ID);
  const r = resolveReceipt(id, claims, cash);
  const amount = r.amount;
  const alloc = allocatePayment(amount);
  const sessionPhone = useSession().phone;
  const masked =
    (sessionPhone ?? tenant?.phone) ? maskPhone((sessionPhone ?? tenant?.phone) as string) : '';

  return (
    <Screen
      title="Receipt"
      back="/home"
      footer={<Button label="Back home" size="lg" onPress={() => go.replace('/home')} />}
    >
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.okSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="checkmark" size={32} color={colors.ok} />
        </View>
        <AppText
          variant="h2"
          color={colors.ok}
          accessibilityRole="header"
          style={{ fontSize: 18, marginTop: 6 }}
        >
          Payment received
        </AppText>
        <Amount minor={amount} size="xl" style={{ letterSpacing: -1 }} />
        <AppText variant="small">{formatNairobiDateTime(r.paidAt)}</AppText>
      </View>

      <Card>
        <KeyValueList
          rows={[
            {
              label: r.source === 'Cash' ? 'Cash receipt' : 'Reference',
              value: r.code,
              mono: true,
            },
            { label: 'Source', value: r.source },
            { label: 'Paid to', value: LANDLORD_NAME },
            {
              label: 'Paybill / account',
              value: `${PAYBILL_PLACEHOLDER} · ${TENANT_ACCOUNT}`,
              mono: true,
            },
            { label: 'Paid from', value: masked || '-' },
          ]}
        />
      </Card>

      <Card style={{ gap: 8 }}>
        <AppText variant="h2">Allocated to</AppText>
        {alloc.lines.map((l) => (
          <View
            key={l.label}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}
          >
            <AppText style={{ flexShrink: 1 }}>{l.label}</AppText>
            <Amount minor={l.amount} prefix={false} />
          </View>
        ))}
        <Divider />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="strong">New balance</AppText>
          <View
            style={{
              backgroundColor: alloc.newBalance === 0n ? colors.okSoft : colors.dangerSoft,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Amount
              minor={alloc.newBalance}
              strong
              tone={alloc.newBalance === 0n ? 'ok' : 'danger'}
            />
          </View>
        </View>
      </Card>

      <AppText variant="caption">
        Your money went directly to your landlord. Kodibox never holds it.
        {masked ? ` A copy was sent to ${masked} by SMS.` : ''}
      </AppText>

      <Row>
        <Button
          label="Share"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => toast('Receipt ready to share (demo)', 'info')}
        />
        <Button
          label="Download PDF"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => toast('Receipt PDF downloaded (demo)', 'ok')}
        />
      </Row>
    </Screen>
  );
}
