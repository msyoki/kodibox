import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText, Divider } from '@/components/primitives';

/** Label on the left, value on the right. Pass `value` as a string or a node such as <Amount />. */
export function KeyValue({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        minHeight: 36,
      }}
    >
      <AppText variant="small" style={{ flex: 1 }}>
        {label}
      </AppText>
      {typeof value === 'string' ? (
        <AppText
          variant={mono ? 'mono' : 'strong'}
          style={{ textAlign: 'right', flexShrink: 0, fontSize: 14 }}
        >
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

/** A list of key/value rows separated by hairlines. */
export function KeyValueList({
  rows,
}: {
  rows: { label: string; value: ReactNode; mono?: boolean }[];
}) {
  return (
    <View style={{ gap: 2 }}>
      {rows.map((r, i) => (
        <View key={r.label}>
          {i > 0 ? <Divider /> : null}
          <KeyValue label={r.label} value={r.value} {...(r.mono ? { mono: true } : {})} />
        </View>
      ))}
    </View>
  );
}
