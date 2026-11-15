import { BALANCE } from '@kodibox/demo';
import { useMemo, useState } from 'react';
import { Button, Chips, Field } from '@/components/controls';
import { KeyValueList } from '@/components/key-value';
import { useToast } from '@/components/overlays';
import { AppText, Card } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { formatMinor, formatNairobiDateTime, parseShillings } from '@/lib/format';
import { PAY_INSTRUCTIONS as I } from '@/lib/pay-instructions';
import { checkSms } from '@/lib/payments-engine';
import { useDemo } from '@/state/demo-state';

const MODES = ['Paste M-Pesa SMS', 'Attach slip'] as const;

/** "I've paid": send proof of payment. It stays pending until a statement line or the manager confirms it. */
export default function ProofOfPayment() {
  const go = useGo();
  const toast = useToast();
  const { paid, claims, addClaim } = useDemo();
  const owed = BALANCE > paid ? BALANCE - paid : 0n;
  const [mode, setMode] = useState<(typeof MODES)[number]>('Paste M-Pesa SMS');
  const [sms, setSms] = useState('');
  const [attached, setAttached] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | undefined>();

  const check = useMemo(() => checkSms(sms, I.accountRef, owed, formatMinor), [sms, owed]);
  const mine = claims.filter((c) => c.by === 'tenant');

  function submit() {
    setError(undefined);
    if (mode === 'Paste M-Pesa SMS') {
      const line = check.line;
      if (!check.ok || !line)
        return setError(check.error ?? 'Paste the full M-Pesa message first.');
      const code = line.externalRef ?? '';
      if (mine.some((c) => c.code === code)) {
        return setError('You already sent this payment. It is waiting to be verified.');
      }
      addClaim({
        code,
        amount: line.amount,
        paidAt: line.paidAt,
        via: 'sms',
        ...(line.accountRef ? { accountRef: line.accountRef } : {}),
      });
    } else {
      const minor = parseShillings(amountText);
      if (!attached) return setError('Attach a photo of the slip first.');
      if (minor === null || minor < 1000n)
        return setError('Enter the amount on the slip, at least KES 10.');
      addClaim({ code: 'SLIP', amount: minor, paidAt: new Date().toISOString(), via: 'slip' });
    }
    toast('Sent. Your landlord will verify it.', 'ok');
    go.replace('/home');
  }

  return (
    <Screen
      title="I've paid"
      back="/pay"
      footer={<Button label="Send for verification" size="lg" onPress={submit} />}
    >
      <Card tone="info" style={{ padding: 12 }}>
        <AppText variant="small">
          Your balance changes once your landlord confirms the payment from their statement. Until
          then it shows as pending verification.
        </AppText>
      </Card>
      <Chips label="Proof" options={MODES} value={mode} onChange={setMode} />

      {mode === 'Paste M-Pesa SMS' ? (
        <>
          <Field
            label="M-Pesa confirmation message"
            value={sms}
            onChangeText={setSms}
            multiline
            autoCapitalize="none"
            placeholder="QFT4AB12CD Confirmed. Ksh..."
            help="Paste the whole SMS you got from M-Pesa."
            error={sms.trim() && !check.ok ? check.error : undefined}
          />
          {check.ok && check.line ? (
            <Card style={{ gap: 8 }}>
              <KeyValueList
                rows={[
                  { label: 'M-Pesa code', value: check.line.externalRef ?? '-', mono: true },
                  { label: 'Amount', value: formatMinor(check.line.amount) },
                  { label: 'Date', value: formatNairobiDateTime(check.line.paidAt) },
                  { label: 'Account', value: check.line.accountRef ?? 'Not found', mono: true },
                ]}
              />
              {check.warnings.map((w) => (
                <Card key={w} tone="warn" style={{ padding: 10 }}>
                  <AppText variant="small">{w}</AppText>
                </Card>
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <Button
            label={attached ? 'Slip attached (demo). Tap to remove' : 'Choose photo of slip (demo)'}
            variant="secondary"
            onPress={() => setAttached((v) => !v)}
          />
          <Field
            label="Amount on the slip (KES)"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="number-pad"
          />
        </>
      )}
      {error ? (
        <AppText variant="small" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}
