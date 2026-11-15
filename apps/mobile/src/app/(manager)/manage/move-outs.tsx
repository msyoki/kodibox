import { formatDate } from '@kodibox/demo';
import { useState } from 'react';
import { View } from 'react-native';
import { ToggleRow } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { OpenOnWeb, cap } from '@/components/manager-ui';
import { AppText, Badge, Card, Divider, EmptyState, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { useDemo } from '@/state/demo-state';

const CHECKLIST = [
  'Notice acknowledged',
  'Final meter readings taken',
  'Inspection completed',
  'Keys returned',
  'Deposit statement prepared',
] as const;

const KIND: Record<string, string> = {
  vacate: 'Notice to vacate',
  lease_end: 'Lease ending',
  rent_increase: 'Rent increase',
};

export default function MoveOuts() {
  const { data, moveOutChecks, toggleMoveOutCheck } = useDemo();
  const [selected, setSelected] = useState<string | null>(null);
  const rows = data.notices.map((n) => ({
    ...n,
    tenant: data.tenants.find((t) => t.id === n.tenantId),
    unit: data.units.find((u) => u.id === n.unitId),
  }));
  const open = rows.find((r) => r.id === selected);
  const done = open ? (moveOutChecks[open.id] ?? []) : [];
  return (
    <Screen title="Notices and move-outs" back="/more">
      <View style={{ gap: 8 }}>
        {rows.length === 0 ? <EmptyState title="No notices" /> : null}
        {rows.map((n) => {
          const count = (moveOutChecks[n.id] ?? []).length;
          return (
            <ListRow
              key={n.id}
              title={`${n.unit?.code ?? ''} · ${n.tenant?.name ?? ''}`}
              subtitle={`${KIND[n.kind] ?? cap(n.kind)} · effective ${formatDate(n.effectiveDate)}`}
              selected={n.id === selected}
              right={
                <>
                  <Badge
                    tone={n.status === 'draft' ? 'neutral' : n.status === 'sent' ? 'info' : 'ok'}
                  >
                    {cap(n.status)}
                  </Badge>
                  {n.kind === 'vacate' ? (
                    <AppText variant="caption">{`${count}/${CHECKLIST.length} done`}</AppText>
                  ) : null}
                </>
              }
              onPress={() => setSelected(n.id === selected ? null : n.id)}
            />
          );
        })}
      </View>

      {open ? (
        <Section title={`Checklist for ${open.unit?.code ?? ''}`}>
          <Card style={{ paddingVertical: 4 }}>
            {CHECKLIST.map((item, i) => (
              <View key={item}>
                {i > 0 ? <Divider /> : null}
                <ToggleRow
                  label={item}
                  value={done.includes(item)}
                  onChange={() => toggleMoveOutCheck(open.id, item)}
                />
              </View>
            ))}
          </Card>
          <AppText variant="caption">
            The caretaker does the walk-through inspection on their phone.
          </AppText>
        </Section>
      ) : (
        <AppText variant="small">Tap a notice to see its move-out checklist.</AppText>
      )}
      <OpenOnWeb what="Issuing notices and the final deposit statement are done on the web app." />
    </Screen>
  );
}
