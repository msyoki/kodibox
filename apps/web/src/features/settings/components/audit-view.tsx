'use client';

import { Badge, Card, CardHeader, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { listAuditEvents } from '@/demo';
import { formatDate } from '@/demo/format';
import { useDemoStore } from '@/demo/store';

export function AuditView() {
  const { data } = useDemoStore();
  const events = listAuditEvents(data);
  return (
    <Card aria-labelledby="audit">
      <CardHeader title="Audit log" id="audit" action={<Badge tone="info">Hash-chained</Badge>} />
      <p className="mt-0 text-sm text-muted">
        Every state change is recorded with who, when and what. Entries are hash-chained and
        append-only: they cannot be edited or deleted. Actions you take in this demo appear here
        live.
      </p>
      <Table minWidth={640}>
        <THead>
          <TR>
            <TH>When</TH>
            <TH>Actor</TH>
            <TH>Action</TH>
            <TH>Summary</TH>
          </TR>
        </THead>
        <TBody>
          {events.map((e) => (
            <TR key={e.id}>
              <TD className="whitespace-nowrap">
                {formatDate(e.at)} {e.at.slice(11, 16)}
              </TD>
              <TD>{e.actor}</TD>
              <TD>
                <code className="font-mono text-xs">{e.action}</code>
              </TD>
              <TD>{e.summary}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
