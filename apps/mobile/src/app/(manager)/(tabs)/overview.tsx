import { MANAGER_FIRST_NAME, getManagerHome } from '@kodibox/demo';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { IconButton } from '@/components/controls';
import type { IconName } from '@/components/icon';
import { ListRow } from '@/components/list-row';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Card, Mark, ProgressBar, Section } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { formatMinor, plural } from '@/lib/format';
import { useDemo, usePendingCounts } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';

export default function ManagerHome() {
  const go = useGo();
  const toast = useToast();
  const { colors } = useTheme();
  const { data, cash } = useDemo();
  const pending = usePendingCounts();
  const home = useMemo(() => getManagerHome(data), [data]);
  const { collection } = home;

  const pendingCash = cash.filter((c) => c.status === 'awaiting_approval');
  const cashTotal = pendingCash.reduce((s, c) => s + c.amount, 0n);

  const items = [
    {
      title: `${plural(pendingCash.length, 'cash entry', 'cash entries')} to approve`,
      sub: `${formatMinor(cashTotal)} from ${home.recorder}`,
      to: '/approvals',
      tone: colors.warning,
    },
    {
      title: `${plural(pending.claims, 'tenant claim')} to verify`,
      sub: 'Payments tenants say they made',
      to: '/approvals',
      tone: colors.warning,
    },
    {
      title: `${plural(pending.lines, 'unmatched statement line')}`,
      sub: `${formatMinor(pending.linesTotal)} waiting for a unit`,
      to: '/approvals',
      tone: colors.warning,
    },
    {
      title: '2 tickets past SLA',
      sub: 'B-14 noise complaint · staff conduct (Owner)',
      to: '/alerts',
      tone: colors.danger,
    },
    {
      title: 'MRI tax due 20 Nov',
      sub: 'Gross rent for October ready to file',
      to: '/alerts',
      tone: colors.danger,
    },
  ];

  const actions: { icon: IconName; label: string; run: () => void }[] = [
    { icon: 'notifications-outline', label: 'Send reminder', run: () => go.push('/tenants') },
    {
      icon: 'receipt-outline',
      label: 'Record expense',
      run: () => toast('Expenses are recorded on the web app (demo)', 'info'),
    },
    {
      icon: 'cloud-upload-outline',
      label: 'Import statement',
      run: () => go.push('/manage/import'),
    },
  ];

  return (
    <Screen
      tabs
      title={`Hi ${MANAGER_FIRST_NAME}`}
      eyebrow={`${data.org.name} · November`}
      right={
        <IconButton
          icon="settings-outline"
          accessibilityLabel="Account and more"
          onPress={() => go.push('/more')}
        />
      }
    >
      <Section title="Collected this month">
        <Card style={{ gap: 14 }}>
          {/* Ring + figures, as in the ManagerHome mockup. */}
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <CollectionRing pct={collection.pct} track={colors.border} fill={colors.brand} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="small">Collected</AppText>
              <Amount minor={collection.collected} strong />
              <AppText variant="small" style={{ marginTop: 6 }}>
                Expected
              </AppText>
              <Amount minor={collection.expected} />
            </View>
          </View>
          <Card
            tone="danger"
            style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}
          >
            <AppText variant="strong" color={colors.danger}>
              Outstanding
            </AppText>
            <Amount minor={collection.outstanding} tone="danger" strong />
          </Card>
          <View style={{ gap: 10 }}>
            {collection.byProperty.map((p) => (
              <View key={p.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText
                    variant="small"
                    color={colors.text}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {p.name}
                  </AppText>
                  <AppText variant="mono">{p.pct}%</AppText>
                </View>
                <ProgressBar
                  value={p.pct}
                  tone={p.pct < 80 ? 'warning' : 'brand'}
                  label={`${p.name} collected`}
                />
              </View>
            ))}
          </View>
        </Card>
      </Section>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={a.run}
            style={{
              flex: 1,
              minHeight: 76,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: 6,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Mark icon={a.icon} size="sm" />
            <AppText
              variant="caption"
              color={colors.text}
              style={{ fontWeight: '600', textAlign: 'center' }}
            >
              {a.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Section title="Needs attention">
        <View style={{ gap: 8 }}>
          {items.map((i) => (
            <ListRow
              key={i.title}
              title={i.title}
              subtitle={i.sub}
              icon="alert-circle-outline"
              markTone={i.tone === colors.danger ? 'danger' : 'warn'}
              onPress={() => go.push(i.to)}
            />
          ))}
        </View>
      </Section>
    </Screen>
  );
}

/** 104px progress ring from the ManagerHome mockup (r=44, stroke 10, starts at 12 o'clock). */
function CollectionRing({ pct, track, fill }: { pct: number; track: string; fill: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${clamped} percent of expected rent collected`}
      style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={104} height={104} viewBox="0 0 104 104" style={{ position: 'absolute' }}>
        <Circle cx={52} cy={52} r={r} fill="none" stroke={track} strokeWidth={10} />
        <Circle
          cx={52}
          cy={52}
          r={r}
          fill="none"
          stroke={fill}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${(c * clamped) / 100} ${c}`}
          transform="rotate(-90 52 52)"
        />
      </Svg>
      <AppText variant="mono" style={{ fontSize: 20, fontWeight: '500' }}>
        {clamped}%
      </AppText>
    </View>
  );
}
