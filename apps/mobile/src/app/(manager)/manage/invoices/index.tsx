import { shortDay } from '@kodibox/demo';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Chips, Field } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { INVOICE_TONE, OpenOnWeb, cap } from '@/components/manager-ui';
import { Amount, AppText, Badge, EmptyState } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { useDemo } from '@/state/demo-state';

const FILTERS = ['All', 'Overdue', 'Unpaid', 'Partial', 'Paid'] as const;

export default function Invoices() {
  const go = useGo();
  const { data } = useDemo();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.invoices
      .map((i) => ({
        ...i,
        tenantName: data.tenants.find((t) => t.id === i.tenantId)?.name ?? '',
        unitCode: data.units.find((u) => u.id === i.unitId)?.code ?? '',
      }))
      .filter((i) => filter === 'All' || i.status === filter.toLowerCase())
      .filter(
        (i) =>
          !needle ||
          i.tenantName.toLowerCase().includes(needle) ||
          i.unitCode.toLowerCase().includes(needle) ||
          i.number.toLowerCase().includes(needle),
      )
      .sort((a, b) => (a.balance === b.balance ? 0 : a.balance < b.balance ? 1 : -1));
  }, [data, filter, q]);
  const shown = rows.slice(0, 40);
  return (
    <Screen title="Invoices" back="/more">
      <Field
        label="Search invoices"
        value={q}
        onChangeText={setQ}
        placeholder="Tenant, unit or number"
        autoCapitalize="none"
      />
      <Chips label="Status" options={FILTERS} value={filter} onChange={setFilter} />
      <AppText variant="small" accessibilityLiveRegion="polite">
        {rows.length} invoices
        {rows.length > shown.length ? `, showing the first ${shown.length}` : ''}
      </AppText>
      <View style={{ gap: 8 }}>
        {shown.length === 0 ? (
          <EmptyState title="No invoices match" description="Try another status or search." />
        ) : null}
        {shown.map((i) => (
          <ListRow
            key={i.id}
            title={`${i.number} · ${i.unitCode}`}
            subtitle={`${i.tenantName} · due ${shortDay(i.dueDate)}`}
            right={
              <>
                <Amount minor={i.balance > 0n ? i.balance : i.total} />
                <Badge tone={INVOICE_TONE[i.status]}>{cap(i.status)}</Badge>
              </>
            }
            onPress={() => go.push(`/manage/invoices/${i.id}`)}
          />
        ))}
      </View>
      <OpenOnWeb what="Monthly invoice runs and bulk reminders are run from the web app." />
    </Screen>
  );
}
