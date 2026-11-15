import { useRef, useState, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';
import { Button, Field, ToggleRow } from '@/components/controls';
import { Card, AppText } from '@/components/primitives';
import { useToast } from '@/components/overlays';
import { Screen, useGo } from '@/components/screen';
import { OTP_LENGTH, sanitizeOtp } from '@/lib/otp';
import { maskPhone, toKenyanE164 } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { useTheme } from '@/theme/theme';

export default function Login() {
  const go = useGo();
  const toast = useToast();
  const { colors } = useTheme();
  const { signIn } = useSession();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [otpError, setOtpError] = useState<string>();
  const [fingerprint, setFingerprint] = useState(true);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const e164 = toKenyanE164(phone);

  function sendCode() {
    if (!e164) {
      setPhoneError('Enter a Kenyan mobile number such as 0712 345 678.');
      return;
    }
    setPhoneError(undefined);
    setStep('otp');
    toast('Code sent by SMS (demo: any 6 digits work)', 'info');
  }

  function verify() {
    if (!e164) return;
    if (code.length < OTP_LENGTH) {
      setOtpError('Enter all 6 digits of the code.');
      return;
    }
    signIn(e164);
    toast(fingerprint ? 'Signed in. Fingerprint enabled.' : 'Signed in', 'ok');
    go.replace('/roles');
  }

  return (
    <Screen title="Sign in" back="/welcome">
      <View style={{ gap: 4 }}>
        <AppText variant="h1">Welcome to Kodibox</AppText>
        <AppText variant="small">
          Sign in with the phone number your landlord or manager has on file.
        </AppText>
      </View>

      {step === 'phone' ? (
        <Card style={{ gap: 14 }}>
          <Field
            label="Phone number"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setPhoneError(undefined);
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="07XX XXX XXX"
            error={phoneError}
          />
          <AppText variant="caption">
            We will send a 6-digit code by SMS. Standard SMS rates may apply. Reply STOP to any
            Kodibox message to opt out of non-essential SMS.
          </AppText>
          <Button label="Send code" size="lg" onPress={sendCode} />
        </Card>
      ) : (
        <Card style={{ gap: 14 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <AppText variant="small">
              Code sent to <AppText variant="strong">{e164 ? maskPhone(e164) : ''}</AppText>
            </AppText>
            <Button label="Change" variant="ghost" size="sm" onPress={() => setStep('phone')} />
          </View>
          <AppText variant="strong" style={{ fontSize: 14 }}>
            Enter the 6-digit code sent by SMS
          </AppText>
          <View style={{ position: 'relative' }}>
            <View style={{ flexDirection: 'row', gap: 8 }} pointerEvents="none">
              {Array.from({ length: OTP_LENGTH }, (_, i) => {
                const active = focused && i === Math.min(code.length, OTP_LENGTH - 1);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      minHeight: 52,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.surface,
                      borderWidth: active ? 2 : 1,
                      borderColor: otpError
                        ? colors.danger
                        : active
                          ? colors.brand
                          : colors.borderStrong,
                      borderRadius: 12,
                    }}
                  >
                    <AppText variant="mono" style={{ fontSize: 24, fontWeight: '500' }}>
                      {code[i] ?? ''}
                    </AppText>
                  </View>
                );
              })}
            </View>
            {/* One hidden input owns the value, so fast typing, paste and SMS autofill never drop digits. */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => {
                setCode(sanitizeOtp(v));
                setOtpError(undefined);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              autoCorrect={false}
              caretHidden
              contextMenuHidden
              selectionColor="transparent"
              underlineColorAndroid="transparent"
              accessibilityLabel="6-digit code"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.011,
                color: 'transparent',
                // Android still draws transparent text faintly; a 1px font keeps it invisible.
                fontSize: 1,
              }}
            />
          </View>
          {otpError ? (
            <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
              {otpError}
            </AppText>
          ) : null}
          <ToggleRow
            label="Use fingerprint next time"
            value={fingerprint}
            onChange={setFingerprint}
          />
          <Button label="Verify and sign in" size="lg" onPress={verify} />
          <Button
            label="Resend code"
            variant="ghost"
            onPress={() => toast('New code sent (demo)', 'info')}
          />
        </Card>
      )}
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        Privacy notice: we only use your number to sign you in and send rent messages.
      </AppText>
    </Screen>
  );
}
