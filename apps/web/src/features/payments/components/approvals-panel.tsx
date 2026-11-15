'use client';

import { Badge, Button, Card, EmptyState, Money, useToast } from '@/components/ui';
import type { PaymentRow } from '@/demo';
import { formatWhen } from '@/demo/format';

export interface SubmittedCash {
  id: string;
  tenantName: string;
  unitCode: string;
  amount: number;
  note: string;
}

interface Props {
  pending: PaymentRow[];
  submitted: SubmittedCash[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ApprovalsPanel({ pending, submitted, onApprove, onReject }: Props) {
  const { toast } = useToast();

  if (pending.length === 0 && submitted.length === 0) {
    return (
      <EmptyState
        title="Nothing waiting for approval"
        description="Cash recorded by caretakers appears here until a manager approves it."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-muted">
        Maker-checker: cash entered by a caretaker only counts toward the invoice once someone else
        approves it. Rejected entries stay in the audit log.
      </p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {pending.map((p) => (
          <li key={p.id}>
            <Card className="flex flex-wrap items-center gap-4">
              <div
                role="img"
                aria-label="Receipt photo placeholder"
                className="flex h-20 w-16 flex-none items-center justify-center rounded-control border border-dashed border-border-strong bg-soft text-center text-[11px] text-muted"
              >
                Receipt photo
              </div>
              <div className="flex min-w-48 flex-1 flex-col gap-1">
                <strong>
                  {p.unitCode} · {p.tenantName}
                </strong>
                <span className="text-sm text-muted">
                  Receipt <span className="font-mono">{p.reference}</span> ·{' '}
                  {formatWhen(p.receivedAt)}
                </span>
                <span className="text-sm text-muted">
                  Recorded by {p.recordedBy ?? 'caretaker'}
                </span>
              </div>
              <Money minor={p.amount} className="text-lg font-bold" />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    onApprove(p.id);
                    toast(`Approved cash ${p.reference}. Invoice updated.`, 'ok');
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    onReject(p.id);
                    toast(`Rejected cash ${p.reference}. Caretaker notified.`, 'warn');
                  }}
                >
                  Reject
                </Button>
              </div>
            </Card>
          </li>
        ))}
        {submitted.map((s) => (
          <li key={s.id}>
            <Card className="flex flex-wrap items-center gap-4">
              <div
                role="img"
                aria-label="Receipt photo placeholder"
                className="flex h-20 w-16 flex-none items-center justify-center rounded-control border border-dashed border-border-strong bg-soft text-center text-[11px] text-muted"
              >
                Receipt photo
              </div>
              <div className="flex min-w-48 flex-1 flex-col gap-1">
                <strong>
                  {s.unitCode} · {s.tenantName}
                </strong>
                <span className="text-sm text-muted">{s.note || 'No note'} · just now</span>
                <span className="text-sm text-muted">Recorded by you</span>
              </div>
              <Money minor={s.amount} className="text-lg font-bold" />
              <Badge tone="warn">Needs a second approver</Badge>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
