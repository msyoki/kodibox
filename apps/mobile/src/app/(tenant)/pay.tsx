import { BALANCE } from '@kodibox/demo';
import { View } from 'react-native';
import { Button } from '@/components/controls';
import { CopyButton } from '@/components/copy-button';
import { Amount, AppText, Card, Section } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { PAY_INSTRUCTIONS as I, PAY_STEPS } from '@/lib/pay-instructions';
import { useDemo } from '@/state/demo-state';

function CopyRow({ label, value, copy }: { label: string; value: string; copy?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="mono">{value}</AppText>
      </View>
      <CopyButton value={copy ?? value} what={label} />
    </View>
  );
}

/** How to pay: the landlord's own paybill, till or bank details. Kodibox never takes the payment. */
export default function HowToPay() {
  const go = useGo();
  const { paid } = useDemo();
  const owed = BALANCE > paid ? BALANCE - paid : 0n;
  const amountPlain = String(owed / 100n);

  return (
    <Screen
      title="How to pay"
      back="/home"
      footer={
        <>
          <Button label="I've paid" size="lg" onPress={() => go.push('/paid')} />
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            Pay from your own M-Pesa or bank app. Your money goes straight to {I.payee}. Kodibox
            never holds it.
          </AppText>
        </>
      }
    >
      <Card style={{ gap: 12 }}>
        <View>
          <AppText variant="small">Amount due</AppText>
          <Amount minor={owed} size="lg" />
        </View>
        <CopyRow label="Amount" value={`KES ${amountPlain}`} copy={amountPlain} />
        <CopyRow label="Business number (Paybill)" value={I.paybill} />
        <CopyRow label="Account number" value={I.accountRef} />
        <AppText variant="caption">
          Always use {I.accountRef} as the account number. It is how your payment finds your lease.
        </AppText>
      </Card>

      <Section title="Pay by M-Pesa">
        <Card style={{ gap: 6 }}>
          <AppText variant="small">
            {PAY_STEPS.map((s) => {
              if (s === 'Business no.') return `${s} ${I.paybill}`;
              if (s === 'Account no.') return `${s} ${I.accountRef}`;
              if (s === 'Amount') return `${s} ${amountPlain}`;
              return s;
            }).join(' → ')}
          </AppText>
        </Card>
      </Section>

      <Section title="Other ways to pay">
        <Card style={{ gap: 12 }}>
          <CopyRow label="Till number (Buy Goods)" value={I.till} />
          <CopyRow label="Bank name" value={I.bankName} />
          <CopyRow label="Bank account number" value={I.bankAccount} />
          <CopyRow label="Bank payment reference" value={I.accountRef} />
        </Card>
      </Section>
    </Screen>
  );
}
