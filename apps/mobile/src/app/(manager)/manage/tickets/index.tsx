import {
  TICKET_STATUS_LABEL,
  TICKET_TONE,
  isOpenTicket,
  listTicketRows,
  shortDay,
} from '@kodibox/demo';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Chips } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { PRIORITY_TONE, cap } from '@/components/manager-ui';
import { AppText, Badge, EmptyState } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { plural } from '@/lib/format';
import { useDemo } from '@/state/demo-state';

const FILTERS = ['Open', 'Unassigned', 'All'] as const;

export default function Tickets() {
  const go = useGo();
  const { data, ticketPatch } = useDemo();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Open');
  const rows = useMemo(
    () =>
      listTicketRows(data)
        .map((t) => ({ ...t, ...ticketPatch[t.id] }))
        .filter((t) =>
          filter === 'All'
            ? true
            : filter === 'Open'
              ? isOpenTicket(t)
              : isOpenTicket(t) && !t.assignee,
        ),
    [data, ticketPatch, filter],
  );
  return (
    <Screen title="Tickets" back="/more">
      <Chips label="Show" options={FILTERS} value={filter} onChange={setFilter} />
      <AppText variant="small" accessibilityLiveRegion="polite">
        {plural(rows.length, 'ticket')}
      </AppText>
      <View style={{ gap: 8 }}>
        {rows.length === 0 ? (
          <EmptyState title="No tickets here" description="Nothing matches this filter." />
        ) : null}
        {rows.map((t) => (
          <ListRow
            key={t.id}
            title={`${t.number} · ${t.title}`}
            subtitle={`${t.unitCode} · ${t.tenantName} · ${shortDay(t.updatedAt)}${t.assignee ? ` · ${t.assignee}` : ''}`}
            right={
              <>
                <Badge tone={TICKET_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                <Badge tone={PRIORITY_TONE[t.priority]}>{cap(t.priority)}</Badge>
              </>
            }
            onPress={() => go.push(`/manage/tickets/${t.id}`)}
          />
        ))}
      </View>
    </Screen>
  );
}
