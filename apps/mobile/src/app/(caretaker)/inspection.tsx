import { INSPECTION, INSPECTION_ROOMS, type Condition } from '@kodibox/demo';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Field, Row, ToggleRow } from '@/components/controls';
import { useToast } from '@/components/overlays';
import { AppText, Card, toneColors, type Tone } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { useDemo } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';

const CONDITIONS: Condition[] = ['Good', 'Fair', 'Damaged'];
const TONE: Record<Condition, Tone> = { Good: 'ok', Fair: 'warn', Damaged: 'danger' };

export default function Inspection() {
  const toast = useToast();
  const { colors } = useTheme();
  const { queueOutbox } = useDemo();
  const [rooms, setRooms] = useState(() => INSPECTION_ROOMS.map((r) => ({ ...r })));
  const [meter, setMeter] = useState<string>(INSPECTION.finalReading);
  const [keys, setKeys] = useState(true);
  const [signed, setSigned] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const update = (i: number, patch: Partial<(typeof rooms)[number]>) =>
    setRooms((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  function submit() {
    if (!signed) {
      setError('The tenant must sign before you submit.');
      return;
    }
    setError(undefined);
    setSubmitted(true);
    queueOutbox(`Inspection ${INSPECTION.unit}`);
    toast('Inspection submitted to the manager', 'ok');
  }

  return (
    <Screen
      title={`Move-out inspection ${INSPECTION.unit}`}
      eyebrow={`${INSPECTION.property} · ${INSPECTION.tenantName}`}
      back="/tasks"
      footer={
        <>
          <Button
            label={submitted ? 'Inspection submitted' : 'Submit inspection'}
            size="lg"
            disabled={submitted}
            onPress={submit}
          />
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            Saved on this phone. The manager reviews any deposit deductions.
          </AppText>
        </>
      }
    >
      {rooms.map((r, i) => (
        <Card key={r.name} style={{ gap: 12 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <AppText variant="h2">{r.name}</AppText>
            <Button
              label={`${r.photos} photos · add`}
              variant="secondary"
              size="sm"
              accessibilityLabel={`Add photo to ${r.name}, ${r.photos} so far`}
              onPress={() => update(i, { photos: r.photos + 1 })}
            />
          </View>
          <View
            style={{ flexDirection: 'row', gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel={`${r.name} condition`}
          >
            {CONDITIONS.map((c) => {
              const on = r.condition === c;
              const t = toneColors(colors, TONE[c]);
              return (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => update(i, { condition: c })}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: on ? t.fg : colors.border,
                    backgroundColor: on ? t.bg : colors.surface,
                  }}
                >
                  <AppText
                    color={on ? t.fg : colors.muted}
                    style={{ fontWeight: '700', fontSize: 13 }}
                  >
                    {c}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <Field
            label={`${r.name} notes`}
            value={r.note}
            onChangeText={(t) => update(i, { note: t })}
            multiline
          />
        </Card>
      ))}

      <Card style={{ gap: 12 }}>
        <AppText variant="h2">Final handover</AppText>
        <Field
          label="Final water reading"
          value={meter}
          onChangeText={setMeter}
          keyboardType="number-pad"
        />
        <ToggleRow
          label={`${INSPECTION.keysReturned} keys returned`}
          value={keys}
          onChange={setKeys}
        />
        <View
          style={{
            minHeight: 96,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: signed ? colors.ok : colors.borderStrong,
            backgroundColor: signed ? colors.okSoft : 'transparent',
          }}
        >
          <AppText
            color={signed ? colors.ok : colors.muted}
            style={{ fontWeight: signed ? '700' : '400' }}
          >
            {signed ? `Signed by ${INSPECTION.tenantName}` : 'Tenant signature here'}
          </AppText>
        </View>
        <Row>
          <Button
            label="Tenant signs"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => setSigned(true)}
          />
          <Button label="Clear" variant="ghost" onPress={() => setSigned(false)} />
        </Row>
        {error ? (
          <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}
