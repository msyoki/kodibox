import {
  ACCESS_TIMES,
  COMPLAINT_ABOUT,
  EMERGENCY_GUIDANCE,
  REQUEST_KINDS,
  URGENCY_LEVELS,
  type RequestKind,
} from '@kodibox/demo';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Chips, Field, ToggleRow } from '@/components/controls';
import { EmergencyBanner } from '@/components/emergency-banner';
import { useToast } from '@/components/overlays';
import { AppText, Card } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { useDemo } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';

export default function NewRequest() {
  const go = useGo();
  const toast = useToast();
  const { colors } = useTheme();
  const { addTicket } = useDemo();
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [subject, setSubject] = useState<string>(COMPLAINT_ABOUT[0]);
  const [priv, setPriv] = useState(true);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState(0);
  const [urgency, setUrgency] = useState<string>('Normal');
  const [access, setAccess] = useState<string>('Morning');
  const [error, setError] = useState<string>();
  const kindLabel = REQUEST_KINDS.find((k) => k.id === kind)?.label;

  function submit() {
    if (!kind) return;
    const text = body.trim();
    if (text.length < 5) {
      setError('Tell us a little more so we can help (at least a few words).');
      return;
    }
    const title =
      kind === 'complaint'
        ? `Complaint: ${subject}`
        : `${kindLabel}: ${text.slice(0, 40)}${text.length > 40 ? '…' : ''}`;
    addTicket({ title, kind, body: text });
    toast('Ticket sent. Your manager has been notified.', 'ok');
    go.replace('/requests');
  }

  return (
    <Screen
      title={kind ? `New ${kindLabel?.toLowerCase()}` : 'New ticket'}
      back="/requests"
      footer={kind ? <Button label="Send ticket" size="lg" onPress={submit} /> : undefined}
    >
      <EmergencyBanner text={EMERGENCY_GUIDANCE} />
      {!kind ? (
        <View style={{ gap: 8 }}>
          <AppText variant="strong">What do you need help with?</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REQUEST_KINDS.map((k) => (
              <Pressable
                key={k.id}
                accessibilityRole="button"
                accessibilityLabel={`${k.label}. ${k.hint}`}
                onPress={() => setKind(k.id)}
                style={{
                  width: '48%',
                  flexGrow: 1,
                  minHeight: 76,
                  padding: 12,
                  gap: 2,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <AppText variant="strong">{k.label}</AppText>
                <AppText variant="caption">{k.hint}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <>
          {kind === 'complaint' ? (
            <>
              <Chips
                label="Complaint about"
                options={COMPLAINT_ABOUT}
                value={subject as (typeof COMPLAINT_ABOUT)[number]}
                onChange={setSubject}
              />
              <Card style={{ paddingVertical: 4 }}>
                <ToggleRow
                  label="Keep my name private from the other party"
                  hint="Management still sees who you are."
                  value={priv}
                  onChange={setPriv}
                />
              </Card>
            </>
          ) : null}
          <Field
            label="Describe what happened"
            value={body}
            onChangeText={(t) => {
              setBody(t);
              setError(undefined);
            }}
            multiline
            placeholder={kind === 'repair' ? 'What is broken and where?' : 'Write your message'}
            error={error}
          />
          <View style={{ gap: 8 }}>
            <AppText variant="strong" style={{ fontSize: 14 }}>
              Photos <AppText variant="small">(optional)</AppText>
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: photos }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    backgroundColor: colors.brandSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText variant="caption" color={colors.link}>
                    Photo {i + 1}
                  </AppText>
                </View>
              ))}
              {photos < 4 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add photo"
                  onPress={() => setPhotos((p) => p + 1)}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText color={colors.link} style={{ fontSize: 28 }}>
                    +
                  </AppText>
                </Pressable>
              ) : null}
            </View>
            <AppText variant="caption">Placeholder only: no photo is uploaded in the demo.</AppText>
          </View>
          <Chips
            label="Urgency"
            options={URGENCY_LEVELS}
            value={urgency as (typeof URGENCY_LEVELS)[number]}
            onChange={setUrgency}
          />
          {kind === 'repair' ? (
            <Chips
              label="Preferred access time"
              options={ACCESS_TIMES}
              value={access as (typeof ACCESS_TIMES)[number]}
              onChange={setAccess}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
