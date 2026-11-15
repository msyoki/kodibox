import { getCollection } from '@kodibox/demo';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/controls';
import { OpenOnWeb, Stat, StatRow } from '@/components/manager-ui';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Card, ProgressBar, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { formatMinor } from '@/lib/format';
import { arrearsAging, propertyStats, totalArrears } from '@/lib/manager-data';
import { useDemo } from '@/state/demo-state';

const REPORTS = [
  { name: 'Monthly rent roll', sub: 'Expected, collected and balance per unit' },
  { name: 'Arrears by age', sub: 'Open balances grouped by days overdue' },
  { name: 'Rental income tax (MRI)', sub: 'Gross rent for the KRA return' },
  { name: 'Landlord statements', sub: 'Gross, commission, expenses and net' },
  { name: 'Occupancy and vacancy', sub: 'Units occupied, vacant and on notice' },
] as const;

export default function Reports() {
  const toast = useToast();
  const { data } = useDemo();
  const c = useMemo(() => getCollection(data), [data]);
  const occ = propertyStats(data);
  const aging = arrearsAging(data);
  return (
    <Screen title="Reports" back="/more">
      <Section title="This month">
        <StatRow>
          <Stat label="Expected" value={formatMinor(c.expected)} />
          <Stat label="Collected" value={formatMinor(c.collected)} tone="ok" />
        </StatRow>
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="small">Collected so far</AppText>
            <AppText variant="strong">{c.pct}%</AppText>
          </View>
          <ProgressBar value={c.pct} label="Collected versus expected" />
        </Card>
        <StatRow>
          <Stat label="Arrears" value={formatMinor(totalArrears(data))} tone="warn" />
          <Stat label="Occupancy" value={`${occ.occupancyPct}%`} />
        </StatRow>
      </Section>

      <Section title="Arrears by age">
        <Card style={{ gap: 10 }}>
          {aging.map((b) => (
            <View key={b.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText>
                {b.label} <AppText variant="caption">({b.count})</AppText>
              </AppText>
              <Amount minor={b.amount} />
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Reports">
        <View style={{ gap: 8 }}>
          {REPORTS.map((r) => (
            <Card key={r.name} style={{ gap: 6 }}>
              <AppText variant="strong">{r.name}</AppText>
              <AppText variant="caption">{r.sub}</AppText>
              <Button
                label="Open on web to export"
                size="sm"
                variant="secondary"
                accessibilityLabel={`Open ${r.name} on web to export`}
                onPress={() => toast('Opens the Kodibox web app in your browser (demo)', 'info')}
              />
            </Card>
          ))}
        </View>
      </Section>
      <OpenOnWeb what="Exports (PDF, Excel, KRA files) are produced on the web app." />
    </Screen>
  );
}
