import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/controls';
import { useToast } from '@/components/overlays';

/** Small "Copy" button: puts `value` on the clipboard and confirms with a toast. */
export function CopyButton({ value, what }: { value: string; what: string }) {
  const toast = useToast();
  return (
    <Button
      label="Copy"
      variant="secondary"
      size="sm"
      accessibilityLabel={`Copy ${what}`}
      onPress={() => {
        Clipboard.setStringAsync(value).then(
          () => toast(`${what} copied`, 'ok'),
          () => toast('Could not copy. Type it in by hand.', 'warn'),
        );
      }}
    />
  );
}
