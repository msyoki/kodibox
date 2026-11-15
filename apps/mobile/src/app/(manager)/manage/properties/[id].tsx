import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Chips } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { UNIT_TONE, cap } from '@/components/manager-ui';
import { Amount, AppText, Badge, Card, EmptyState } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { propertyStats } from '@/lib/manager-data';
import { useDemo } from '@/state/demo-state';

const FILTERS = ['All', 'Occupied', 'Vacant', 'Notice'] as const;

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const go = useGo();
  const { data } = useDemo();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const property = data.properties.find((p) => p.id === id);
  if (!property) {
    return (
      <Screen title="Property" back="/manage/properties">
        <EmptyState title="Property not found" />
      </Screen>
    );
  }
  const s = propertyStats(data, property.id);
  const landlord = data.landlords.find((l) => l.id === property.landlordId);
  const units = data.units
    .filter((u) => u.propertyId === property.id)
    .filter((u) => filter === 'All' || u.status === filter.toLowerCase());
  return (
    <Screen title={property.name} eyebrow={property.area} back="/manage/properties">
      <Card style={{ gap: 4 }}>
        <AppText variant="small">
          {s.occupied} of {s.units} units occupied ({s.occupancyPct}%) · {s.vacant} vacant
        </AppText>
        <AppText variant="small">Caretaker: {property.caretaker}</AppText>
        {landlord ? <AppText variant="small">Landlord: {landlord.name}</AppText> : null}
      </Card>
      <Chips label="Show units" options={FILTERS} value={filter} onChange={setFilter} />
      <View style={{ gap: 8 }}>
        {units.length === 0 ? (
          <EmptyState title="No units match" description="Try another filter." />
        ) : null}
        {units.map((u) => {
          const tenant = data.tenants.find((t) => t.id === u.tenantId);
          return (
            <ListRow
              key={u.id}
              title={`${u.code} · ${u.type}`}
              subtitle={tenant ? tenant.name : 'No tenant'}
              right={
                <>
                  <Amount minor={u.rent} />
                  <Badge tone={UNIT_TONE[u.status]}>{cap(u.status)}</Badge>
                </>
              }
              {...(tenant ? { onPress: () => go.push(`/manage/tenant/${tenant.id}`) } : {})}
            />
          );
        })}
      </View>
    </Screen>
  );
}
