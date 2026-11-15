import { useMemo } from 'react';
import { View } from 'react-native';
import { Button, Row } from '@/components/controls';
import { OpenOnWeb, Stat, StatRow } from '@/components/manager-ui';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Badge, Card, EmptyState, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { plural } from '@/lib/format';
import { useDemo } from '@/state/demo-state';

/** Water readings review: flagged anomalies first, then recorded readings waiting for approval. */
export default function Utilities() {
  const toast = useToast();
  const {
    data,
    readings,
    flaggedReadings,
    resolvedReadings,
    resolveReading,
    approvedReadings,
    approveReading,
  } = useDemo();
  const flagged = flaggedReadings.filter((r) => !resolvedReadings.includes(r.id));
  const metered = readings.filter((m) => m.propertyId === 'prop_mvule');
  const recorded = metered.filter((m) => m.status !== 'pending').length;
  const toApprove = useMemo(
    () => readings.filter((m) => m.status === 'recorded' && !approvedReadings.includes(m.id)),
    [readings, approvedReadings],
  );
  return (
    <Screen title="Utilities" back="/more">
      <StatRow>
        <Stat
          label="Mvule readings in"
          value={`${recorded} of ${metered.length}`}
          tone={recorded < metered.length ? 'warn' : 'ok'}
        />
        <Stat label="To approve" value={String(toApprove.length)} />
      </StatRow>

      <Section title="Flagged readings">
        {flagged.length === 0 ? <AppText variant="small">No unusual readings.</AppText> : null}
        {flagged.map((r) => (
          <Card key={r.id} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="strong">
                  {r.unit} · {r.property}
                </AppText>
                <AppText variant="caption">
                  Used {r.used} units, usual {r.usual}
                </AppText>
              </View>
              <Badge tone="warn">Check</Badge>
            </View>
            <Row>
              <Button
                label="Ask re-read"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  resolveReading(r.id);
                  toast(`Asked the caretaker to re-read ${r.unit}`, 'info');
                }}
              />
              <Button
                label="Approve"
                style={{ flex: 1 }}
                onPress={() => {
                  resolveReading(r.id);
                  toast(`Reading ${r.unit} approved`, 'ok');
                }}
              />
            </Row>
          </Card>
        ))}
      </Section>

      <Section
        title="Recorded readings"
        right={
          toApprove.length > 0 ? (
            <Button
              label="Approve all"
              size="sm"
              variant="secondary"
              onPress={() => {
                toApprove.forEach((m) => approveReading(m.id));
                toast(`${plural(toApprove.length, 'reading')} approved`, 'ok');
              }}
            />
          ) : undefined
        }
      >
        {toApprove.length === 0 ? <EmptyState title="All readings approved" /> : null}
        {toApprove.slice(0, 12).map((m) => {
          const used = (m.current ?? m.previous) - m.previous;
          const unit = data.units.find((u) => u.id === m.unitId);
          return (
            <Card
              key={m.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="strong" style={{ fontSize: 14 }}>
                  {unit?.code ?? m.unitId}
                </AppText>
                <AppText variant="caption">
                  {m.previous} to {m.current} · {used} units
                </AppText>
              </View>
              <Amount minor={BigInt(used) * m.ratePerUnit} />
              <Button
                label="Approve"
                size="sm"
                variant="secondary"
                accessibilityLabel={`Approve reading ${unit?.code ?? ''}`}
                onPress={() => {
                  approveReading(m.id);
                  toast(`Reading ${unit?.code ?? ''} approved`, 'ok');
                }}
              />
            </Card>
          );
        })}
      </Section>
      <OpenOnWeb what="Changing water rates and running utility invoices are done on the web app." />
    </Screen>
  );
}
