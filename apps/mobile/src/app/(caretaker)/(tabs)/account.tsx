import { AccountBody } from '@/components/account';
import { Screen } from '@/components/screen';

export default function CaretakerAccount() {
  return (
    <Screen tabs title="Account">
      <AccountBody role="caretaker" />
    </Screen>
  );
}
