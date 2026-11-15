import { getCollection } from '@kodibox/demo';
import { useMemo } from 'react';
import { View } from 'react-native';
import { ListRow } from '@/components/list-row';
import { OpenOnWeb } from '@/components/manager-ui';
import { AppText, Badge, ProgressBar } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { propertyStats } from '@/lib/manager-data';
import { useDemo } from '@/state/demo-state';

export default function Properties() {
  const go = useGo();
  const { data } = useDemo();
  const collection = useMemo(() => getCollection(data), [data]);
  const all = propertyStats(data);
  return (
    <Screen title="Properties" back="/more">
      <AppText variant="small">
        {data.properties.length} properties · {all.units} units · {all.occupancyPct}% occupied
      </AppText>
      <View style={{ gap: 8 }}>
        {data.properties.map((p) => {
          const s = propertyStats(data, p.id);
          const c = collection.byProperty.find((x) => x.id === p.id);
          return (
            <View key={p.id} style={{ gap: 6 }}>
              <ListRow
                title={p.name}
                subtitle={`${p.area} · ${s.units} units · caretaker ${p.caretaker}`}
                icon="business-outline"
                right={
                  <Badge tone={s.occupancyPct < 90 ? 'warn' : 'ok'}>{`${s.occupancyPct}%`}</Badge>
                }
                onPress={() => go.push(`/manage/properties/${p.id}`)}
              />
              {c ? (
                <ProgressBar
                  value={c.pct}
                  label={`${p.name} collected`}
                  tone={c.pct < 80 ? 'warning' : 'brand'}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      <OpenOnWeb what="Adding properties and units, and bulk imports, are done on the web app." />
    </Screen>
  );
}
