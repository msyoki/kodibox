import { formatDate, type Expense } from '@kodibox/demo';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Chips } from '@/components/controls';
import { OpenOnWeb, cap } from '@/components/manager-ui';
import { useToast } from '@/components/overlays';
import { Amount, AppText, Badge, Card, EmptyState } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { useDemo } from '@/state/demo-state';

const FILTERS = ['Pending', 'Approved', 'Paid', 'All'] as const;
const TONE: Record<Expense['status'], 'warn' | 'info' | 'ok'> = {
  pending: 'warn',
  approved: 'info',
  paid: 'ok',
};

/** Expenses and repairs: approving records the decision only. Kodibox never pays vendors. */
export default function Maintenance() {
  const go = useGo();
  const toast = useToast();
  const { data, expenseStatus, setExpenseStatus } = useDemo();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Pending');
  const rows = useMemo(
    () =>
      data.expenses
        .map((e) => ({
          ...e,
          status: expenseStatus[e.id] ?? e.status,
          property: data.properties.find((p) => p.id === e.propertyId)?.name ?? '',
        }))
        .filter((e) => filter === 'All' || e.status === filter.toLowerCase())
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data, expenseStatus, filter],
  );
  return (
    <Screen title="Expenses and repairs" back="/more">
      <Chips label="Status" options={FILTERS} value={filter} onChange={setFilter} />
      <View style={{ gap: 8 }}>
        {rows.length === 0 ? (
          <EmptyState title="Nothing here" description="No expenses match this filter." />
        ) : null}
        {rows.map((e) => (
          <Card key={e.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="strong" style={{ fontSize: 14 }}>
                  {e.description}
                </AppText>
                <AppText variant="caption">
                  {e.vendor} · {e.property} · {cap(e.category)} · {formatDate(e.date)}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Amount minor={e.amount} strong />
                <Badge tone={TONE[e.status]}>{cap(e.status)}</Badge>
              </View>
            </View>
            {e.status === 'pending' ? (
              <Button
                label="Approve expense"
                size="sm"
                accessibilityLabel={`Approve ${e.description}`}
                onPress={() => {
                  setExpenseStatus(e.id, 'approved');
                  toast('Expense approved. Pay the vendor from your own account.', 'ok');
                }}
              />
            ) : null}
            {e.ticketId ? (
              <Button
                label="Open linked ticket"
                size="sm"
                variant="ghost"
                onPress={() => go.push(`/manage/tickets/${e.ticketId}`)}
              />
            ) : null}
          </Card>
        ))}
      </View>
      <OpenOnWeb what="Recording new expenses with receipts is done on the web app." />
    </Screen>
  );
}
