import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, toneColors, type Tone } from '@/components/primitives';
import { useTheme } from '@/theme/theme';

/** Modal confirm sheet with a title, optional description and a footer of buttons. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close dialog"
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'center', padding: 24 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.backdrop,
            opacity: 0.8,
          }}
        />
        <Pressable
          accessible={false}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 20,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <AppText variant="h1" accessibilityRole="header">
            {title}
          </AppText>
          {description ? <AppText variant="small">{description}</AppText> : null}
          {children}
          {footer ? (
            <View
              style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}
            >
              {footer}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ToastState {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

/** Short-lived message banner shown above the tab bar. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const show = useCallback((message: string, tone: Tone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const t = toast ? toneColors(colors, toast.tone) : null;
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && t ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 72 + insets.bottom,
            backgroundColor: t.bg,
            borderColor: t.fg,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <AppText color={t.fg} style={{ fontWeight: '700', fontSize: 14 }}>
            {toast.message}
          </AppText>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, tone?: Tone) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
