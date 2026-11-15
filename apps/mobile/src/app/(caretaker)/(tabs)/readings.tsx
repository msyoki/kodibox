import { listReadingQueue } from '@kodibox/demo';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Field, PhotoButton } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Card, ProgressBar, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { plural } from '@/lib/format';
import { useDemo } from '@/state/demo-state';
import { plexMono } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export default function Readings() {
  const toast = useToast();
  const { colors } = useTheme();
  const { data, readingsDone, saveReading, outbox } = useDemo();
  const queue = useMemo(() => listReadingQueue(data), [data]);
  const [idx, setIdx] = useState(() =>
    Math.max(
      0,
      queue.findIndex((q) => q.current === null),
    ),
  );
  const [value, setValue] = useState('');
  const [photo, setPhoto] = useState(false);
  const [error, setError] = useState<string>();

  const total = queue.length;
  const isPending = (q: { id: string; current: number | null }) =>
    q.current === null && !(q.id in readingsDone);
  const doneCount = queue.filter((q) => !isPending(q)).length;
  const cur = queue[idx];
  const reading = Number(value.replace(/,/g, ''));
  const blank = value.trim() === '';
  const wholeNumber = !blank && Number.isInteger(reading);
  const tooLow = wholeNumber && reading < (cur?.previous ?? 0);
  const valid = wholeNumber && !tooLow;
  const liveError = blank
    ? undefined
    : !wholeNumber
      ? 'Enter the reading as a whole number.'
      : tooLow
        ? `Reading cannot be lower than the last one (${cur?.previous ?? 0}).`
        : undefined;
  const consumption = valid && cur ? reading - cur.previous : 0;
  const amount = cur ? BigInt(consumption) * cur.ratePerUnit : 0n;
  const upNext = queue.filter((q, i) => i > idx && isPending(q)).slice(0, 3);
  const finished = doneCount >= total;

  if (!cur) return null;

  function save() {
    if (!cur) return;
    if (!valid) {
      setError(blank ? 'Enter the new reading.' : liveError);
      return;
    }
    if (!photo) {
      setError('Add a photo of the meter first.');
      return;
    }
    setError(undefined);
    saveReading(cur.id, reading, cur.unitCode);
    toast(`${cur.unitCode} saved on this phone`, 'ok');
    const next = queue.findIndex((q, i) => i > idx && isPending(q));
    if (next >= 0) setIdx(next);
    setValue('');
    setPhoto(false);
  }

  return (
    <Screen tabs title="Water readings" eyebrow="Mvule Apartments · November">
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="strong">
            {doneCount} of {total} units done
          </AppText>
          <AppText variant="small">Due by 28 Nov</AppText>
        </View>
        <ProgressBar value={(doneCount / total) * 100} label="Readings progress" />
        <AppText variant="caption" accessibilityLiveRegion="polite">
          {outbox.length > 0
            ? `Offline · ${plural(outbox.length, 'item')} saved on this phone, will sync automatically`
            : 'All synced'}
        </AppText>
      </View>

      {finished ? (
        <Card>
          <AppText>
            All {total} units are read. The manager reviews unusual readings before invoicing.
          </AppText>
        </Card>
      ) : (
        <Section title={`Unit ${cur.unitCode}`}>
          <Card style={{ gap: 12, borderWidth: 2, borderColor: colors.brand, borderRadius: 16 }}>
            <AppText variant="mono" muted style={{ fontSize: 13 }}>
              Meter {cur.meter}
            </AppText>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="small">Last reading (Oct)</AppText>
              <AppText variant="mono" style={{ fontSize: 20 }}>
                {cur.previous.toLocaleString('en-KE')}
              </AppText>
            </View>
            <Field
              label="New reading"
              value={value}
              onChangeText={(t) => {
                setValue(t);
                setError(undefined);
              }}
              keyboardType="number-pad"
              style={{ fontFamily: plexMono('400'), fontSize: 20 }}
              placeholder={String(cur.previous)}
              error={liveError ?? error}
            />
            <Card
              tone="brand"
              style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}
            >
              <AppText variant="small">{consumption} units × rate</AppText>
              <Amount minor={amount} strong />
            </Card>
            <PhotoButton
              added={photo}
              onToggle={() => setPhoto((p) => !p)}
              label="Add meter photo (required)"
            />
            <Button label="Save and next unit" size="lg" onPress={save} />
          </Card>
        </Section>
      )}

      <Section title="Up next">
        {upNext.length === 0 ? (
          <AppText variant="small">No more units in the queue.</AppText>
        ) : (
          <View style={{ gap: 8 }}>
            {upNext.map((u) => (
              <ListRow
                key={u.id}
                title={u.unitCode}
                right={
                  <AppText variant="small">Last: {u.previous.toLocaleString('en-KE')}</AppText>
                }
              />
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}
