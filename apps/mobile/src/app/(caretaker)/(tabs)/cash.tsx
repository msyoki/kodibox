import { CARETAKER_NAME, listCashTenantOptions, type CashStatus } from '@kodibox/demo';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Chips, Field, PhotoButton } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Badge, Card, Section, type Tone } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { formatNairobiDate, parseShillings } from '@/lib/format';
import { useDemo } from '@/state/demo-state';

const STATUS: Record<CashStatus, { label: string; tone: Tone }> = {
  awaiting_approval: { label: 'Pending', tone: 'warn' },
  matched: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export default function CaretakerCash() {
  const toast = useToast();
  const { data, cash, addCash } = useDemo();
  const options = useMemo(() => listCashTenantOptions(data), [data]);
  const mine = cash.filter((c) => c.recordedBy === CARETAKER_NAME);
  const [picked, setPicked] = useState(options[0]?.label ?? '');
  const [amount, setAmount] = useState('');
  const [book, setBook] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const labels = options.map((o) => o.label);
  const visible = showAll ? labels : labels.slice(0, 6);

  function submit() {
    const e: Record<string, string> = {};
    const minor = parseShillings(amount);
    if (minor === null || minor <= 0n) e.amount = 'Enter the amount received.';
    if (!book.trim()) e.book = 'Enter the receipt book number.';
    if (!photo) e.photo = 'Add a photo of the paper receipt.';
    setErrors(e);
    if (Object.keys(e).length > 0 || minor === null) return;
    const opt = options.find((o) => o.label === picked);
    const tenantName = (opt?.label ?? '').split(' · ')[1] ?? '';
    addCash({ unitCode: opt?.unitCode ?? '', tenantName, reference: book.trim(), amount: minor });
    toast('Sent to manager for approval', 'ok');
    setAmount('');
    setBook('');
    setNote('');
    setPhoto(false);
  }

  return (
    <Screen tabs title="Record cash payment" eyebrow="Baraka Flats">
      <Section title="New cash entry">
        <Card style={{ gap: 14 }}>
          <Chips label="Tenant and unit" options={visible} value={picked} onChange={setPicked} />
          {!showAll && labels.length > 6 ? (
            <Button
              label="Show all units"
              variant="ghost"
              size="sm"
              onPress={() => setShowAll(true)}
            />
          ) : null}
          <Field
            label="Amount (KES)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="14,000"
            error={errors.amount}
          />
          <Field
            label="Receipt book no."
            value={book}
            onChangeText={setBook}
            placeholder="RB-004521"
            error={errors.book}
          />
          <View style={{ gap: 6 }}>
            <PhotoButton
              added={photo}
              onToggle={() => setPhoto((p) => !p)}
              label="Photo of paper receipt (required)"
            />
            {errors.photo ? (
              <AppText variant="caption" accessibilityRole="alert">
                {errors.photo}
              </AppText>
            ) : null}
          </View>
          <Field label="Note" optional value={note} onChangeText={setNote} />
          <AppText variant="caption">
            Goes to the manager for approval before it counts. You cannot approve your own entry.
          </AppText>
          <Button label="Submit for approval" size="lg" onPress={submit} />
        </Card>
      </Section>

      <Section title="My entries">
        <View style={{ gap: 8 }}>
          {mine.map((p) => {
            const s = STATUS[p.status];
            return (
              <ListRow
                key={p.id}
                title={`${p.unitCode} · ${p.tenantName}`}
                monoSubtitle
                subtitle={`${p.reference} · ${formatNairobiDate(p.receivedAt)}`}
                right={
                  <>
                    <Amount minor={p.amount} prefix={false} />
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </>
                }
              />
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}
