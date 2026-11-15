import { TICKET_STATUS_LABEL, TICKET_TONE, ticketTimeline } from '@kodibox/demo';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Field, Row } from '@/components/controls';
import { useToast } from '@/components/overlays';
import { AppText, Badge, Card, EmptyState, Section } from '@/components/primitives';
import { Screen, useGo } from '@/components/screen';
import { formatNairobiDate, formatNairobiDateTime } from '@/lib/format';
import { useDemo } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const go = useGo();
  const toast = useToast();
  const { colors, onBrand } = useTheme();
  const { tickets, setTicketStatus, addTicketMessage, feedback, setFeedback } = useDemo();
  const [draft, setDraft] = useState('');
  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <Screen title="Ticket" back="/requests">
        <EmptyState
          title="Ticket not found"
          description="It may belong to another tenant."
          action={<Button label="My tickets" onPress={() => go.replace('/requests')} />}
        />
      </Screen>
    );
  }

  const fb = feedback[ticket.id] ?? { rating: 0, fixed: false };
  const resolved = ticket.status === 'resolved' || ticket.status === 'closed';
  const timeline = ticketTimeline(ticket.status, ticket.assignee);

  function send() {
    const body = draft.trim();
    if (!body || !ticket) return;
    addTicketMessage(ticket.id, body);
    setDraft('');
    toast('Message sent', 'ok');
  }

  return (
    <Screen title={ticket.title} back="/requests">
      <AppText variant="mono" muted style={{ fontSize: 12 }}>
        {ticket.number} · {ticket.kindLabel} · opened {formatNairobiDate(ticket.createdAt)}
      </AppText>

      <Card style={{ gap: 12 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <AppText variant="h2">Progress</AppText>
          <Badge tone={TICKET_TONE[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</Badge>
        </View>
        {timeline.map((s) => (
          <View
            key={s.title}
            accessible
            accessibilityLabel={`${s.title}, ${s.done ? 'done' : 'not yet'}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: s.done ? colors.brand : colors.soft,
                borderWidth: s.done ? 0 : 1,
                borderColor: colors.borderStrong,
              }}
            >
              <AppText color={onBrand} style={{ fontSize: 12, fontWeight: '800' }}>
                {s.done ? '✓' : ''}
              </AppText>
            </View>
            <AppText style={{ fontWeight: s.done ? '700' : '400' }} muted={!s.done}>
              {s.title}
            </AppText>
          </View>
        ))}
      </Card>

      <Section title="Messages">
        {ticket.messages.map((m) => {
          const mine = m.role === 'tenant';
          return (
            <View
              key={m.id}
              style={{
                gap: 4,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                marginRight: mine ? 32 : 0,
                marginLeft: mine ? 0 : 32,
                borderColor: mine ? colors.divider : colors.brandSoft,
                backgroundColor: mine ? colors.surface : colors.brandSoft,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <AppText variant="caption" color={colors.text} style={{ fontWeight: '700' }}>
                  {mine ? 'You' : m.author}
                </AppText>
                <AppText variant="caption">{formatNairobiDateTime(m.at)}</AppText>
              </View>
              <AppText>{m.body}</AppText>
            </View>
          );
        })}
        <Field
          label="Add a message"
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="Write to your manager"
        />
        <Row>
          <Button
            label="Photo"
            variant="secondary"
            accessibilityLabel="Add photo"
            onPress={() => toast('Photo attached (placeholder)', 'info')}
          />
          <Button label="Send" style={{ flex: 1 }} disabled={!draft.trim()} onPress={send} />
        </Row>
      </Section>

      {resolved ? (
        <Card style={{ gap: 12 }}>
          <AppText variant="h2">Was this fixed?</AppText>
          <Row>
            <Button
              label="Yes, fixed"
              style={{ flex: 1 }}
              onPress={() => {
                setFeedback(ticket.id, { fixed: true });
                setTicketStatus(ticket.id, 'closed');
                toast('Thanks. Ticket closed.', 'ok');
              }}
            />
            <Button
              label="Reopen"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                setFeedback(ticket.id, { fixed: false });
                setTicketStatus(ticket.id, 'in_progress');
                addTicketMessage(ticket.id, 'Reopened: the problem is not fixed.');
                toast('Ticket reopened', 'warn');
              }}
            />
          </Row>
          <AppText variant="strong" style={{ fontSize: 14 }}>
            Rate the resolution{' '}
            <AppText variant="small">{fb.rating ? `· ${fb.rating} of 5` : '· tap a star'}</AppText>
          </AppText>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}`}
                accessibilityState={{ selected: fb.rating === n }}
                onPress={() => {
                  setFeedback(ticket.id, { rating: n });
                  toast(`Rated ${n} of 5`, 'ok');
                }}
                style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText
                  color={n <= fb.rating ? colors.amber : colors.muted}
                  style={{ fontSize: 30 }}
                >
                  {n <= fb.rating ? '★' : '☆'}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : (
        <Button
          label="Demo only: simulate the manager marking this resolved"
          variant="ghost"
          onPress={() => {
            setTicketStatus(ticket.id, 'resolved');
            toast('Demo: manager marked this resolved', 'info');
          }}
        />
      )}
    </Screen>
  );
}
