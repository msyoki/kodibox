import { searchTenants, whenLabel } from '@kodibox/demo';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Chips, Field } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { OpenOnWeb, cap } from '@/components/manager-ui';
import { useToast } from '@/components/overlays';
import { AppText, Badge, Card, EmptyState } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { maskPhone } from '@/lib/phone';
import { useDemo } from '@/state/demo-state';

const VIEWS = ['Inbox', 'Sent', 'Compose'] as const;
const STOP_LINE = ' Reply STOP to opt out.';

export default function Messages() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  const toast = useToast();
  const { data, sentMessages, sendMessage } = useDemo();
  const [view, setView] = useState<(typeof VIEWS)[number]>(to ? 'Compose' : 'Inbox');
  const [q, setQ] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(to ?? null);
  const [body, setBody] = useState('');

  const inbox = useMemo(
    () =>
      data.ticketMessages
        .filter((m) => m.role === 'tenant' && !m.internal)
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 15),
    [data],
  );
  const results = useMemo(() => (q.trim() ? searchTenants(data, q, 5) : []), [data, q]);
  const target = tenantId
    ? searchTenants(data, '', 1000).find((t) => t.id === tenantId)
    : undefined;
  const optedOut = !!target?.smsOptOut;
  const canSend = !!target && !optedOut && body.trim().length >= 3;

  return (
    <Screen title="Messages" back="/more">
      <Chips label="Show" options={VIEWS} value={view} onChange={setView} />

      {view === 'Inbox' ? (
        <View style={{ gap: 8 }}>
          {inbox.length === 0 ? <EmptyState title="Inbox is empty" /> : null}
          {inbox.map((m) => (
            <Card key={m.id} style={{ gap: 2, padding: 12 }}>
              <AppText variant="strong" style={{ fontSize: 14 }}>
                {m.author}
              </AppText>
              <AppText>{m.body}</AppText>
              <AppText variant="caption">{whenLabel(m.at)}</AppText>
            </Card>
          ))}
        </View>
      ) : null}

      {view === 'Sent' ? (
        <View style={{ gap: 8 }}>
          {sentMessages.map((m) => (
            <Card key={m.id} style={{ gap: 2, padding: 12 }}>
              <AppText variant="strong" style={{ fontSize: 14 }}>
                To {m.unitCode} · {m.to}
              </AppText>
              <AppText>{m.body}</AppText>
              <Badge tone="ok">Sent (demo)</Badge>
            </Card>
          ))}
          {data.messages.map((m) => (
            <ListRow
              key={m.id}
              title={m.body}
              subtitle={`${cap(m.channel)} · ${m.audience} · ${m.recipients} recipients · ${whenLabel(m.sentAt)}`}
              right={
                <Badge
                  tone={m.status === 'sent' ? 'ok' : m.status === 'scheduled' ? 'info' : 'danger'}
                >
                  {cap(m.status)}
                </Badge>
              }
            />
          ))}
        </View>
      ) : null}

      {view === 'Compose' ? (
        <View style={{ gap: 12 }}>
          {target ? (
            <Card style={{ gap: 4 }}>
              <AppText variant="strong">
                {target.name} · {target.unitCode}
              </AppText>
              <AppText variant="small">{maskPhone(target.phone)}</AppText>
              {optedOut ? <Badge tone="warn">Opted out of SMS. Use a call instead.</Badge> : null}
              <Button
                label="Choose someone else"
                size="sm"
                variant="ghost"
                onPress={() => setTenantId(null)}
              />
            </Card>
          ) : (
            <>
              <Field
                label="Find a tenant"
                value={q}
                onChangeText={setQ}
                placeholder="Name or unit"
                autoCapitalize="none"
              />
              {results.map((t) => (
                <ListRow
                  key={t.id}
                  title={t.name}
                  subtitle={`${t.unitCode} · ${t.propertyName}`}
                  right={t.smsOptOut ? <Badge tone="warn">Opted out</Badge> : undefined}
                  onPress={() => {
                    setTenantId(t.id);
                    setQ('');
                  }}
                />
              ))}
            </>
          )}
          <Field
            label="Message"
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Write a short SMS"
            help={`Sent with:${STOP_LINE}`}
          />
          <Button
            label="Send SMS"
            disabled={!canSend}
            onPress={() => {
              if (!target) return;
              sendMessage({
                to: target.name,
                unitCode: target.unitCode,
                body: body.trim() + STOP_LINE,
              });
              toast(`SMS sent to ${target.name} (demo)`, 'ok');
              setBody('');
              setView('Sent');
            }}
          />
        </View>
      ) : null}
      <OpenOnWeb what="Bulk messages, templates and scheduling are on the web app." />
    </Screen>
  );
}
