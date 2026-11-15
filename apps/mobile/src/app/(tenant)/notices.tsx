import {
  MIN_NOTICE_DAYS,
  TENANT_DOCS,
  TENANT_NOTICES,
  earliestVacateDate,
  formatDate,
} from '@kodibox/demo';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Row } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { useToast } from '@/components/overlays';
import { AppText, Badge, Card, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { useDemo } from '@/state/demo-state';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function Notices() {
  const toast = useToast();
  const { vacateDate, setVacateDate } = useDemo();
  const min = earliestVacateDate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(min);
  const [error, setError] = useState<string>();

  function send() {
    if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      setError('Enter the date as YYYY-MM-DD, for example 2026-12-05.');
      return;
    }
    if (date < min) {
      setError(
        `Choose ${formatDate(min)} or later: your lease needs ${MIN_NOTICE_DAYS} days notice.`,
      );
      return;
    }
    setVacateDate(date);
    setOpen(false);
    setError(undefined);
    toast('Notice sent to your landlord', 'ok');
  }

  return (
    <Screen title="Notices and documents" back="/home">
      <Section title="From your landlord">
        {TENANT_NOTICES.map((n) => (
          <Card key={n.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <AppText variant="strong" style={{ flex: 1 }}>
                {n.title}
              </AppText>
              <Badge tone={n.tag === 'Action' ? 'warn' : 'info'}>{n.tag}</Badge>
            </View>
            <AppText>{n.body}</AppText>
            <AppText variant="caption">{n.meta}</AppText>
          </Card>
        ))}
      </Section>

      <Section title="Moving out?">
        <Card style={{ gap: 12 }}>
          <AppText variant="small">
            Your lease needs at least {MIN_NOTICE_DAYS} days written notice. Giving notice is not a
            final commitment until your landlord confirms the date.
          </AppText>
          {vacateDate ? (
            <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
              <Badge tone="ok">{`Notice sent for ${formatDate(vacateDate)}`}</Badge>
              <AppText variant="small">Waiting for your landlord to confirm.</AppText>
              <Button
                label="Withdraw notice"
                variant="secondary"
                onPress={() => {
                  setVacateDate(null);
                  toast('Notice withdrawn', 'info');
                }}
              />
            </View>
          ) : !open ? (
            <Button
              label="Give notice to vacate"
              variant="secondary"
              onPress={() => setOpen(true)}
            />
          ) : (
            <View style={{ gap: 12 }}>
              <Field
                label="Move-out date"
                value={date}
                onChangeText={(t) => {
                  setDate(t);
                  setError(undefined);
                }}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                error={error}
                help={`Earliest allowed date: ${formatDate(min)} (${MIN_NOTICE_DAYS} days from today).`}
              />
              <Row>
                <Button
                  label="Cancel"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setOpen(false)}
                />
                <Button label="Send notice" style={{ flex: 1 }} onPress={send} />
              </Row>
            </View>
          )}
        </Card>
      </Section>

      <Section title="Documents">
        {TENANT_DOCS.map((d) => (
          <ListRow
            key={d.id}
            title={d.title}
            subtitle={d.sub}
            accessibilityLabel={`Download ${d.title.toLowerCase()}`}
            right={<Badge tone="brand">Download</Badge>}
            onPress={() => toast(`${d.title} downloaded (demo)`, 'ok')}
          />
        ))}
      </Section>
    </Screen>
  );
}
