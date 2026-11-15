import { View } from 'react-native';
import { Button, IconButton } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { Amount, AppText, Badge, Mark, Section } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { formatMinor, formatNairobiDate } from '@/lib/format';
import { useDemo } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';
import {
  BALANCE,
  DUE_LABEL,
  HOME_LINES,
  PAYBILL_PLACEHOLDER,
  PROPERTY_LABEL,
  RECENT_RECEIPTS,
  TENANT_ACCOUNT,
  TENANT_FIRST_NAME,
  TICKET_STATUS_LABEL,
  TICKET_TONE,
  isOpenTicket,
} from '@kodibox/demo';
import { Pressable } from 'react-native';

const ACTIONS = [
  { icon: 'list-outline', label: 'Statement', to: '/payments' },
  { icon: 'construct-outline', label: 'Report issue', to: '/requests' },
  { icon: 'megaphone-outline', label: 'Notices', to: '/notices' },
  { icon: 'document-text-outline', label: 'Lease', to: '/notices' },
] as const;

export default function TenantHome() {
  const go = useGo();
  const { colors, onBrandStrong } = useTheme();
  const { paid, tickets, claims } = useDemo();
  const pending = claims.filter((c) => c.by === 'tenant' && c.status === 'pending');
  const pendingTotal = pending.reduce((s, c) => s + c.amount, 0n);
  const balance = BALANCE > paid ? BALANCE - paid : 0n;
  const ticket = tickets.find((t) => isOpenTicket(t));

  return (
    <Screen
      tabs
      title={`Hi ${TENANT_FIRST_NAME}`}
      eyebrow={PROPERTY_LABEL}
      right={
        <IconButton
          icon="notifications-outline"
          accessibilityLabel="Notices"
          onPress={() => go.push('/notices')}
        />
      }
    >
      {/* Balance card: brand fill, white title/amount, soft tint for secondary labels (mockup TenantHome). */}
      <View
        style={{
          backgroundColor: colors.brand,
          borderRadius: 18,
          padding: 20,
          gap: 14,
        }}
      >
        <View>
          <AppText variant="small" color={colors.onBrand}>
            {balance > 0n ? `Amount due by ${DUE_LABEL}` : 'You are all paid up'}
          </AppText>
          <Amount
            minor={balance}
            size="xl"
            style={{ color: onBrandStrong, marginTop: 4, letterSpacing: -1 }}
          />
        </View>
        {balance > 0n ? (
          <View style={{ gap: 6 }}>
            {HOME_LINES.map((l) => (
              <View key={l.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="small" color={colors.onBrand} style={{ flexShrink: 1 }}>
                  {l.label}
                </AppText>
                <Amount
                  minor={l.amount}
                  prefix={false}
                  style={{ color: colors.onBrand, fontSize: 13 }}
                />
              </View>
            ))}
          </View>
        ) : null}
        {pending.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.brandDark,
              borderRadius: 12,
              padding: 12,
              gap: 2,
            }}
          >
            <AppText variant="strong" color={onBrandStrong}>
              Pending verification
            </AppText>
            <AppText variant="small" color={colors.onBrand}>
              {formatMinor(pendingTotal)} you reported paying. Your balance updates once your
              landlord confirms it.
            </AppText>
          </View>
        ) : null}
        <Button
          label={balance > 0n ? 'Pay rent' : 'View latest receipt'}
          size="lg"
          variant="accent"
          onPress={() => go.push(balance > 0n ? '/pay' : '/receipt')}
        />
        <AppText variant="caption" color={colors.onBrand} style={{ textAlign: 'center' }}>
          Or Paybill{' '}
          <AppText variant="caption" color={onBrandStrong} style={{ fontWeight: '700' }}>
            {PAYBILL_PLACEHOLDER}
          </AppText>
          {' · Account '}
          <AppText variant="caption" color={onBrandStrong} style={{ fontWeight: '700' }}>
            {TENANT_ACCOUNT}
          </AppText>
          . Pay from your own M-Pesa or bank.
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="menu">
        {ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={() => go.push(a.to)}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 6,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingVertical: 12,
              paddingHorizontal: 4,
            }}
          >
            <Mark icon={a.icon} size="sm" />
            <AppText variant="caption" color={colors.text} style={{ fontWeight: '600' }}>
              {a.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {ticket ? (
        <Section title="Open request">
          <ListRow
            title={ticket.title}
            subtitle={`${ticket.number} · ${ticket.kindLabel}`}
            right={
              <Badge tone={TICKET_TONE[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</Badge>
            }
            onPress={() => go.push(`/ticket/${ticket.id}`)}
          />
        </Section>
      ) : null}

      <Section
        title="Recent receipts"
        right={
          <Button
            label="Statement"
            variant="ghost"
            size="sm"
            onPress={() => go.push('/payments')}
          />
        }
      >
        {RECENT_RECEIPTS.map((r) => (
          <Pressable
            key={r.ref}
            accessibilityRole="button"
            accessibilityLabel={`Receipt ${r.ref}`}
            onPress={() => go.push(`/receipt?id=recent:${r.ref}`)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
            }}
          >
            <View style={{ gap: 2, flexShrink: 1 }}>
              <AppText variant="strong" style={{ fontSize: 14 }}>
                {r.title}
              </AppText>
              <AppText variant="mono" muted style={{ fontSize: 12 }}>
                {r.ref} · {formatNairobiDate(r.paidAt)}
              </AppText>
            </View>
            <Amount minor={r.amount} />
          </Pressable>
        ))}
      </Section>
    </Screen>
  );
}
