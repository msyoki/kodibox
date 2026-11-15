'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, Dialog, Money, useToast } from '@/components/ui';
import { MaskedText } from '@/components/ui';
import { ScreenHeader, Section } from '@/components/mobile-ui/screen';
import { useDemoStore } from '@/demo/store';
import { getTenant, listUnmatched } from '@/demo';
import { listPendingCash } from '@/demo/mobile';

type Pending =
  | { kind: 'approve-cash'; id: string; label: string }
  | { kind: 'match'; id: string; tenantId: string; invoiceId: string; label: string }
  | { kind: 'accept-reading'; id: string; label: string };

const UNUSUAL = [{ id: 'rd-m14', unit: 'M-14', property: 'Mvule Apartments', used: 62, usual: 11 }];

export function ManagerApprovals() {
  const { data, actions } = useDemoStore();
  const { toast } = useToast();
  const cash = useMemo(() => listPendingCash(data), [data]);
  const unmatched = useMemo(() => listUnmatched(data), [data]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [scanning, setScanning] = useState(false);
  const [readings, setReadings] = useState(UNUSUAL);

  const waiting = cash.length + unmatched.length + readings.length;

  const confirm = () => {
    if (!pending) return;
    setScanning(true);
    // Simulated biometric check.
    window.setTimeout(() => {
      if (pending.kind === 'approve-cash') {
        actions.approveCash(pending.id);
        toast(`Approved ${pending.label}`, 'ok');
      } else if (pending.kind === 'match') {
        actions.matchPayment(pending.id, pending.tenantId, pending.invoiceId);
        toast(`Matched ${pending.label}`, 'ok');
      } else {
        setReadings((r) => r.filter((x) => x.id !== pending.id));
        toast(`Reading ${pending.label} accepted`, 'ok');
      }
      setScanning(false);
      setPending(null);
    }, 700);
  };

  return (
    <>
      <ScreenHeader
        title="Approvals"
        right={<Badge tone={waiting > 0 ? 'warn' : 'ok'}>{waiting} waiting</Badge>}
      />
      <p
        role="note"
        className="mx-4 mt-3 mb-0 rounded-control bg-info-soft px-3 py-2 text-sm font-semibold text-info"
      >
        Each approval asks for fingerprint or face unlock, or your 2FA code.
      </p>

      <Section title="Cash from caretaker" id="cash">
        {cash.length === 0 ? (
          <p className="m-0 text-sm text-muted">No cash entries waiting.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {cash.map((p) => (
              <li key={p.id}>
                <Card className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm">
                      <strong className="block">
                        {p.unitCode} · {p.tenantName}
                      </strong>
                      <span className="text-xs text-muted">
                        {p.recordedBy} · Receipt {p.reference}
                      </span>
                    </span>
                    <strong>
                      <Money minor={p.amount} prefix={false} />
                    </strong>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        actions.rejectCash(p.id);
                        toast(`Rejected ${p.reference}. The caretaker is told why.`, 'warn');
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() =>
                        setPending({
                          kind: 'approve-cash',
                          id: p.id,
                          label: `${p.unitCode} cash ${p.reference}`,
                        })
                      }
                    >
                      Approve
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Unmatched M-Pesa" id="mp">
        {unmatched.length === 0 ? (
          <p className="m-0 text-sm text-muted">Every payment is matched.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {unmatched.map((u) => {
              const s = u.suggestions[0];
              const t = s ? getTenant(s.tenantId, data) : undefined;
              return (
                <li key={u.id}>
                  <Card className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm">
                        <strong className="block font-mono">{u.reference}</strong>
                        <span className="text-xs text-muted">
                          {u.payerPhoneMasked ??
                            (u.payerPhone ? (
                              <MaskedText kind="phone" value={u.payerPhone} />
                            ) : (
                              'No phone'
                            ))}{' '}
                          · account &quot;
                          {u.accountEntered}&quot;
                        </span>
                      </span>
                      <strong>
                        <Money minor={u.amount} prefix={false} />
                      </strong>
                    </div>
                    {s && t ? (
                      <div className="flex items-center justify-between gap-2 rounded-control bg-brand-tint px-3 py-2 text-sm">
                        <span>
                          Suggested:{' '}
                          <strong>
                            {t.unit.code} · {t.tenant.name}
                          </strong>
                        </span>
                        <Button
                          size="sm"
                          onClick={() =>
                            setPending({
                              kind: 'match',
                              id: u.id,
                              tenantId: s.tenantId,
                              invoiceId: s.invoiceId,
                              label: `${u.reference} to ${t.tenant.name}`,
                            })
                          }
                        >
                          Confirm
                        </Button>
                      </div>
                    ) : (
                      <p className="m-0 text-xs text-muted">
                        No suggestion. Match it on the web app.
                      </p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Unusual water readings" id="rd">
        {readings.length === 0 ? (
          <p className="m-0 text-sm text-muted">No unusual readings.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {readings.map((r) => (
              <li key={r.id}>
                <Card className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm">
                      <strong className="block">
                        {r.unit} · {r.property}
                      </strong>
                      <span className="text-xs text-muted">
                        Used {r.used} units, usual {r.usual}
                      </span>
                    </span>
                    <Badge tone="warn">Check</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setReadings((x) => x.filter((y) => y.id !== r.id));
                        toast(`Asked Otieno Ouma to re-read ${r.unit}`);
                      }}
                    >
                      Ask re-read
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() =>
                        setPending({ kind: 'accept-reading', id: r.id, label: r.unit })
                      }
                    >
                      Accept
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="mx-4 mt-4 mb-0 text-center text-xs text-muted">
        Every decision is logged and can be reversed, never deleted. Kodibox never holds the money.
      </p>

      <Dialog
        open={pending !== null}
        onClose={() => (scanning ? undefined : setPending(null))}
        title="Confirm with fingerprint"
        description={
          pending
            ? `Approve ${pending.label}. This asks for your fingerprint, face unlock or 2FA code.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={scanning}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={scanning}>
              {scanning ? 'Checking...' : 'Touch sensor to confirm'}
            </Button>
          </>
        }
      >
        <p className="m-0 text-sm text-muted" aria-live="polite">
          {scanning ? 'Verifying your fingerprint...' : 'Simulated in the prototype.'}
        </p>
      </Dialog>
    </>
  );
}
