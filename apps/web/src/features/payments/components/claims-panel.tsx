'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Money,
  Select,
  Textarea,
  useToast,
  type Tone,
} from '@/components/ui';
import type { ClaimStatus, DemoData, PaymentClaim } from '@/demo';
import { formatWhen } from '@/demo/format';

const STATUS: Record<ClaimStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending verification', tone: 'warn' },
  verified: { label: 'Verified by statement', tone: 'ok' },
  approved: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

interface Props {
  data: DemoData;
  claims: PaymentClaim[];
  onApprove: (claimId: string, note: string, assignTenantId?: string) => void;
  onReject: (claimId: string, reason: string) => void;
}

type Mode = { kind: 'approve' | 'reject'; claim: PaymentClaim };

/** Tenant payment claims. A claim never moves money: it needs a statement line or an approval. */
export function ClaimsPanel({ data, claims, onApprove, onReject }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode | null>(null);
  const [note, setNote] = useState('');
  const [assign, setAssign] = useState('');

  if (claims.length === 0) {
    return (
      <EmptyState
        title="No payment claims"
        description="When a tenant pastes an M-Pesa message or uploads a slip, it appears here until a statement line confirms it."
      />
    );
  }

  const close = () => {
    setMode(null);
    setNote('');
    setAssign('');
  };
  const valid =
    note.trim().length >= 3 && (mode?.kind !== 'approve' || !!mode.claim.tenantId || !!assign);

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-muted">
        Claims are evidence, not money. Importing a statement that contains the same M-Pesa code
        verifies a claim automatically. Otherwise a manager approves it with a note.
      </p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {claims.map((c) => (
          <li key={c.id}>
            <Card className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <strong>
                    {c.tenantName} · {c.unitCode}
                  </strong>
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  <Badge tone="neutral">{c.kind === 'sms' ? 'M-Pesa SMS' : 'Slip photo'}</Badge>
                  {c.payeeMismatch ? <Badge tone="danger">Payee does not match</Badge> : null}
                </span>
                <span className="text-sm text-muted">
                  {c.code ? <span className="font-mono">{c.code}</span> : 'No code on slip'} ·
                  submitted {formatWhen(c.submittedAt)}
                  {c.paidAt ? ` · paid ${formatWhen(c.paidAt)}` : ''}
                </span>
                {c.kind === 'slip' ? (
                  <span className="text-sm text-muted">
                    Slip: {c.slipName ?? 'photo'} (placeholder)
                  </span>
                ) : null}
                {c.note ? (
                  <span className="text-sm">
                    {c.status === 'rejected' ? 'Reason' : 'Note'}: {c.note}
                    {c.reviewedBy ? ` (${c.reviewedBy})` : ''}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                {c.amount !== undefined ? <Money minor={c.amount} className="font-bold" /> : null}
                {c.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button onClick={() => setMode({ kind: 'approve', claim: c })}>Approve</Button>
                    <Button
                      variant="secondary"
                      onClick={() => setMode({ kind: 'reject', claim: c })}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog
        open={mode !== null}
        onClose={close}
        title={mode?.kind === 'approve' ? 'Approve claim' : 'Reject claim'}
        description={
          mode?.kind === 'approve'
            ? 'Approving posts the payment to the tenant account. Say why you trust it (second-person check).'
            : 'The tenant is told the claim was not accepted.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={!valid}
              onClick={() => {
                if (!mode) return;
                if (mode.kind === 'approve') {
                  onApprove(mode.claim.id, note, assign || undefined);
                  toast('Claim approved and posted. It is in the audit log.', 'ok');
                } else {
                  onReject(mode.claim.id, note);
                  toast('Claim rejected.', 'info');
                }
                close();
              }}
            >
              {mode?.kind === 'approve' ? 'Approve and post' : 'Reject claim'}
            </Button>
          </>
        }
      >
        {mode?.kind === 'approve' && !mode.claim.tenantId ? (
          <Field
            label="Assign to tenant"
            htmlFor="claim-assign"
            help={`Unit ${mode.claim.unitCode} was not found.`}
          >
            <Select id="claim-assign" value={assign} onChange={(e) => setAssign(e.target.value)}>
              <option value="">Choose a tenant…</option>
              {data.tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label={mode?.kind === 'approve' ? 'Approval note' : 'Reason'} htmlFor="claim-note">
          <Textarea id="claim-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}
