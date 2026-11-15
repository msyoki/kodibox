import {
  BALANCE,
  DEMO_RECEIPT,
  DUE_LABEL,
  RECENT_RECEIPTS,
  TENANT_ACCOUNT,
  PROPERTY_LABEL,
  STATEMENT_MONTHS,
  getLedger,
  type LedgerRow,
  type StatementMonth,
} from '@kodibox/demo';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Chips } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { Amount, AppText, Badge, Card, Divider, Section } from '@/components/primitives';
import { useToast } from '@/components/overlays';
import { Screen, useGo } from '@/components/screen';
import { formatNairobiDate } from '@/lib/format';
import { claimLabel, claimTone } from '@/lib/payments-engine';
import { useDemo } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';

export default function Statement() {
  const go = useGo();
  const { colors, onBrandStrong } = useTheme();
  const toast = useToast();
  const { paid, claims, cash } = useDemo();
  const mine = claims.filter((c) => c.by === 'tenant');
  const myCash = cash.filter((c) => c.unitCode === TENANT_ACCOUNT && c.status === 'matched');
  const [month, setMonth] = useState<StatementMonth>('nov');
  const balance = BALANCE > paid ? BALANCE - paid : 0n;
  const base = getLedger(month);
  // Latest payment that actually counts (manager-approved or confirmed by a statement line).
  const latestCounted = mine
    .filter((c) => c.status === 'approved' || c.status === 'verified_statement')
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0];
  const paidRef = latestCounted
    ? `${latestCounted.code} · ${formatNairobiDate(latestCounted.paidAt)}`
    : `${DEMO_RECEIPT.code} · ${formatNairobiDate(DEMO_RECEIPT.paidAt)}`;
  const rows: LedgerRow[] =
    month === 'nov' && paid > 0n
      ? [
          {
            title: 'Payment · M-Pesa',
            sub: paidRef,
            delta: -paid,
            balance,
          },
          ...base,
        ]
      : base;

  return (
    <Screen
      tabs
      title="Payments"
      eyebrow={PROPERTY_LABEL}
      footer={
        <Button
          label="Download statement PDF"
          variant="secondary"
          onPress={() => toast('Statement PDF downloaded (demo)', 'ok')}
        />
      }
    >
      {/* Mockup: brand-green balance strip, white amount, amber action. */}
      <View
        style={{
          backgroundColor: colors.brand,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="small" color={colors.onBrand}>
            Current balance{balance > 0n ? ` · due ${DUE_LABEL.replace('November', 'Nov')}` : ''}
          </AppText>
          <Amount minor={balance} size="lg" style={{ color: onBrandStrong, letterSpacing: -1 }} />
        </View>
        {balance > 0n ? (
          <Button label="Pay rent" variant="accent" onPress={() => go.push('/pay')} />
        ) : null}
      </View>

      <Section title="Payments">
        <View style={{ gap: 8 }}>
          {mine.map((c) => (
            <ListRow
              key={c.id}
              title={c.via === 'slip' ? 'Bank slip' : `M-Pesa ${c.code}`}
              subtitle={`${formatNairobiDate(c.paidAt)}${c.status === 'rejected' && c.reason ? ` · ${c.reason}` : ''}`}
              right={
                <>
                  <Amount minor={c.amount} />
                  <Badge tone={claimTone(c)}>{claimLabel(c)}</Badge>
                </>
              }
              {...(c.status === 'approved' || c.status === 'verified_statement'
                ? { onPress: () => go.push(`/receipt?id=claim:${c.id}`) }
                : {})}
            />
          ))}
          {myCash.map((c) => (
            <ListRow
              key={c.id}
              title={`Cash ${c.reference}`}
              subtitle={formatNairobiDate(c.receivedAt)}
              right={
                <>
                  <Amount minor={c.amount} />
                  <Badge tone="ok">Verified</Badge>
                </>
              }
              onPress={() => go.push(`/receipt?id=cash:${c.id}`)}
            />
          ))}
          {RECENT_RECEIPTS.map((r) => (
            <ListRow
              key={r.ref}
              title={r.title}
              monoSubtitle
              subtitle={`${r.ref} · ${formatNairobiDate(r.paidAt)}`}
              right={
                <>
                  <Amount minor={r.amount} />
                  <Badge tone="ok">Verified</Badge>
                </>
              }
              onPress={() => go.push(`/receipt?id=recent:${r.ref}`)}
            />
          ))}
        </View>
      </Section>

      <Chips
        label="Filter by month"
        options={STATEMENT_MONTHS.map((m) => m.label)}
        value={STATEMENT_MONTHS.find((m) => m.key === month)?.label ?? 'Nov 2026'}
        onChange={(l) => {
          const m = STATEMENT_MONTHS.find((x) => x.label === l);
          if (m) setMonth(m.key);
        }}
      />

      <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
        <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
          <AppText variant="caption" style={{ flex: 1, fontWeight: '700' }}>
            Entry
          </AppText>
          <AppText variant="caption" style={{ width: 92, textAlign: 'right', fontWeight: '700' }}>
            Amount
          </AppText>
          <AppText variant="caption" style={{ width: 92, textAlign: 'right', fontWeight: '700' }}>
            Balance
          </AppText>
        </View>
        {rows.map((r) => (
          <View key={`${r.title}-${r.sub}`}>
            <Divider />
            <View style={{ flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="strong" style={{ fontSize: 14 }}>
                  {r.title}
                </AppText>
                <AppText variant="caption">{r.sub}</AppText>
              </View>
              <View style={{ width: 92, alignItems: 'flex-end' }}>
                <Amount
                  minor={r.delta}
                  prefix={false}
                  {...(r.delta < 0n ? { tone: 'ok' as const } : {})}
                />
              </View>
              <View style={{ width: 92, alignItems: 'flex-end' }}>
                <Amount minor={r.balance} prefix={false} strong />
              </View>
            </View>
          </View>
        ))}
      </Card>
      <AppText variant="caption">
        Amounts in KES. Invoices add to what you owe. Payments reduce it. Corrections show as new
        lines and nothing is deleted.
      </AppText>
    </Screen>
  );
}
