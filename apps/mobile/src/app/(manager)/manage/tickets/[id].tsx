import {
  CARETAKER_NAME,
  TICKET_STATUS_LABEL,
  TICKET_TONE,
  listTicketMessages,
  whenLabel,
  type TicketStatus,
} from '@kodibox/demo';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Chips } from '@/components/controls';
import { PRIORITY_TONE, cap } from '@/components/manager-ui';
import { useToast } from '@/components/overlays';
import { AppText, Badge, Card, EmptyState, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { useDemo } from '@/state/demo-state';

const STATUSES: readonly TicketStatus[] = ['new', 'assigned', 'in_progress', 'resolved', 'closed'];
const LABEL_TO_STATUS = Object.fromEntries(
  STATUSES.map((s) => [TICKET_STATUS_LABEL[s], s]),
) as Record<string, TicketStatus>;

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { data, ticketPatch, patchTicket } = useDemo();
  const base = data.tickets.find((t) => t.id === id);
  if (!base) {
    return (
      <Screen title="Ticket" back="/manage/tickets">
        <EmptyState title="Ticket not found" />
      </Screen>
    );
  }
  const ticket = { ...base, ...ticketPatch[base.id] };
  const unit = data.units.find((u) => u.id === ticket.unitId);
  const tenant = data.tenants.find((t) => t.id === ticket.tenantId);
  const property = data.properties.find((p) => p.id === ticket.propertyId);
  const assignees = [
    CARETAKER_NAME,
    ...(property && property.caretaker !== CARETAKER_NAME ? [property.caretaker] : []),
    'Mwenda Plumbers',
  ];
  const messages = listTicketMessages(data, ticket.id).filter((m) => !m.internal);

  return (
    <Screen
      title={ticket.number}
      eyebrow={`${unit?.code ?? ''} · ${property?.name ?? ''}`}
      back="/manage/tickets"
    >
      <Card style={{ gap: 8 }}>
        <AppText variant="h1">{ticket.title}</AppText>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone={TICKET_TONE[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</Badge>
          <Badge tone={PRIORITY_TONE[ticket.priority]}>{cap(ticket.priority)}</Badge>
          <Badge>{cap(ticket.category)}</Badge>
        </View>
        <AppText variant="small">
          Reported by {tenant?.name ?? 'tenant'} · {whenLabel(ticket.createdAt)}
        </AppText>
        <AppText variant="small">Assigned to {ticket.assignee ?? 'nobody yet'}</AppText>
      </Card>

      <Section title="Assign">
        <Chips
          label="Assign to"
          options={assignees}
          value={ticket.assignee ?? ''}
          onChange={(a) => {
            patchTicket(ticket.id, {
              assignee: a,
              ...(ticket.status === 'new' ? { status: 'assigned' as const } : {}),
            });
            toast(`Assigned to ${a}`, 'ok');
          }}
        />
      </Section>

      <Section title="Status">
        <Chips
          label="Change status"
          options={STATUSES.map((s) => TICKET_STATUS_LABEL[s])}
          value={TICKET_STATUS_LABEL[ticket.status]}
          onChange={(l) => {
            const next = LABEL_TO_STATUS[l];
            if (next) {
              patchTicket(ticket.id, { status: next });
              toast(`Status set to ${l}`, 'ok');
            }
          }}
        />
      </Section>

      <Section title="Conversation">
        {messages.length === 0 ? <AppText variant="small">No messages yet.</AppText> : null}
        {messages.map((m) => (
          <Card key={m.id} style={{ gap: 2, padding: 12 }}>
            <AppText variant="strong" style={{ fontSize: 14 }}>
              {m.author}
            </AppText>
            <AppText>{m.body}</AppText>
            <AppText variant="caption">{whenLabel(m.at)}</AppText>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
