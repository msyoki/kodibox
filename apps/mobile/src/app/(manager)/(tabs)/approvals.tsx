import { normaliseAccountRef } from '@kodibox/core';
import { shortDay } from '@kodibox/demo';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Chips, Field, Row } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { Dialog, useToast } from '@/components/overlays';
import { Amount, AppText, Badge, Card } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { receiptLabel } from '@/lib/format';
import { claimLabel, claimTone, type ImportLine } from '@/lib/payments-engine';
import { useDemo, usePendingCounts } from '@/state/demo-state';

type Pending =
  | { kind: 'approve-cash'; id: string; label: string }
  | { kind: 'approve-claim'; id: string; label: string }
  | { kind: 'assign'; line: ImportLine; tenantId: string; unitCode: string; tenantName: string }
  | { kind: 'not-rent'; line: ImportLine; reason: string }
  | { kind: 'accept-reading'; id: string; label: string };

const NOT_RENT_REASONS = ["Landlord's own transfer", 'Deposit', 'Other'] as const;
type NotRentReason = (typeof NOT_RENT_REASONS)[number];

const SEGMENTS = ['Claims', 'Unmatched', 'Cash', 'Readings'] as const;
type Segment = (typeof SEGMENTS)[number];

export default function Approvals() {
  const toast = useToast();
  const {
    data,
    cash,
    setCashStatus,
    claims,
    approveClaim,
    rejectClaim,
    importLines,
    importDecisions,
    resolveImportLine,
    resolvedReadings,
    resolveReading,
    flaggedReadings,
    auditLog,
  } = useDemo();
  const counts = usePendingCounts();
  const [segment, setSegment] = useState<Segment>('Claims');
  const pendingClaims = claims.filter((c) => c.status === 'pending');
  const doneClaims = claims.filter((c) => c.status !== 'pending');
  const pendingCash = cash.filter((c) => c.status === 'awaiting_approval');
  const openLines = importLines.filter((l) => !importDecisions[l.id]);
  const readings = flaggedReadings.filter((r) => !resolvedReadings.includes(r.id));
  const [pending, setPending] = useState<Pending | null>(null);
  const [scanning, setScanning] = useState(false);
  const [rejecting, setRejecting] = useState<{ id: string; label: string } | null>(null);
  const [reason, setReason] = useState('');
  const [assigning, setAssigning] = useState<ImportLine | null>(null);
  const [notRent, setNotRent] = useState<ImportLine | null>(null);
  const [notRentChoice, setNotRentChoice] = useState<NotRentReason | null>(null);
  const [notRentOther, setNotRentOther] = useState('');
  const [q, setQ] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const labels: Record<Segment, string> = {
    Claims: `Claims (${counts.claims})`,
    Unmatched: `Unmatched (${counts.lines})`,
    Cash: `Cash (${counts.cash})`,
    Readings: `Readings (${counts.readings})`,
  };

  /** Biometric step-up is stubbed: a short "checking" state, then the action runs. */
  function confirm() {
    if (!pending) return;
    const p = pending;
    setScanning(true);
    timer.current = setTimeout(() => {
      if (p.kind === 'approve-cash') {
        setCashStatus(p.id, 'matched');
        toast(`Approved ${p.label}`, 'ok');
      } else if (p.kind === 'approve-claim') {
        approveClaim(p.id);
        toast(`Verified ${p.label}`, 'ok');
      } else if (p.kind === 'not-rent') {
        resolveImportLine(p.line.id, { kind: 'not_rent', reason: p.reason, ref: p.line.code });
        toast(`${p.line.code} marked as not rent`, 'info');
      } else if (p.kind === 'assign') {
        resolveImportLine(p.line.id, {
          kind: 'assigned',
          tenantId: p.tenantId,
          unitCode: p.unitCode,
          tenantName: p.tenantName,
          ref: p.line.code,
        });
        toast(`${p.line.code} assigned to ${p.unitCode}`, 'ok');
      } else {
        resolveReading(p.id);
        toast(`Reading ${p.label} accepted`, 'ok');
      }
      setScanning(false);
      setPending(null);
    }, 700);
  }

  const query = q.trim().toLowerCase();
  const tenantChoices = data.tenants
    .map((t) => ({ t, code: data.units.find((u) => u.id === t.unitId)?.code ?? '' }))
    .filter(
      ({ t, code }) =>
        query === '' || t.name.toLowerCase().includes(query) || code.toLowerCase().includes(query),
    )
    .slice(0, 5);

  return (
    <Screen
      tabs
      title="Approvals"
      right={<Badge tone={counts.total > 0 ? 'warn' : 'ok'}>{`${counts.total} waiting`}</Badge>}
    >
      <Card tone="info" style={{ padding: 12 }}>
        <AppText variant="small">
          Each approval asks for fingerprint or face unlock, or your 2FA code.
        </AppText>
      </Card>
      <Chips
        label="Show"
        options={SEGMENTS.map((s) => labels[s])}
        value={labels[segment]}
        onChange={(l) => setSegment(SEGMENTS.find((s) => labels[s] === l) ?? 'Claims')}
      />

      {segment === 'Claims' ? (
        <View style={{ gap: 8 }}>
          {pendingClaims.length === 0 ? (
            <AppText variant="small">No tenant claims waiting.</AppText>
          ) : null}
          {pendingClaims.map((c) => {
            const mismatch =
              !!c.accountRef &&
              normaliseAccountRef(c.accountRef) !== normaliseAccountRef(c.unitCode);
            return (
              <Card key={c.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="strong">
                      {c.unitCode} · {c.tenantName}
                    </AppText>
                    <AppText variant="caption">
                      {c.via === 'slip' ? 'Bank slip' : c.code} · {shortDay(c.paidAt)} ·{' '}
                      {c.review ? 'code found, needs review' : 'not in a statement yet'}
                    </AppText>
                    {mismatch ? (
                      <AppText variant="caption">Account typed: {c.accountRef}</AppText>
                    ) : null}
                  </View>
                  <Amount minor={c.amount} prefix={false} strong />
                </View>
                <Row>
                  <Button
                    label="Reject"
                    variant="secondary"
                    style={{ flex: 1 }}
                    accessibilityLabel={`Reject claim ${c.code}`}
                    onPress={() => {
                      setReason('');
                      setRejecting({ id: c.id, label: `${c.unitCode} ${c.code}` });
                    }}
                  />
                  <Button
                    label="Approve"
                    style={{ flex: 1 }}
                    accessibilityLabel={`Approve claim ${c.code}`}
                    onPress={() =>
                      setPending({
                        kind: 'approve-claim',
                        id: c.id,
                        label: `${c.unitCode} ${c.code}`,
                      })
                    }
                  />
                </Row>
              </Card>
            );
          })}
          {doneClaims.map((c) => (
            <ListRow
              key={c.id}
              title={`${c.unitCode} · ${c.tenantName}`}
              monoSubtitle
              subtitle={`${c.via === 'slip' ? 'Bank slip' : c.code}${c.reason ? ` · ${c.reason}` : ''}`}
              right={
                <>
                  <Amount minor={c.amount} prefix={false} />
                  <Badge tone={claimTone(c)}>{claimLabel(c)}</Badge>
                </>
              }
            />
          ))}
        </View>
      ) : null}

      {segment === 'Unmatched' ? (
        <View style={{ gap: 8 }}>
          <AppText variant="small">
            Lines from the last statement import that could not be matched with confidence.
          </AppText>
          {openLines.length === 0 ? (
            <AppText variant="small">Every statement line is matched.</AppText>
          ) : null}
          {openLines.map((u) => (
            <Card key={u.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="mono">{u.code}</AppText>
                  <AppText variant="caption">
                    {u.payerName} · {shortDay(u.paidAt)} · account &quot;{u.accountRef || 'none'}
                    &quot;
                  </AppText>
                </View>
                <Amount minor={u.amount} prefix={false} strong />
              </View>
              {u.suggestions.slice(0, 2).map((s) => (
                <Card key={s.tenantId} tone="brand" style={{ padding: 12, gap: 8 }}>
                  <AppText variant="small">
                    Suggested:{' '}
                    <AppText variant="strong">
                      {s.unitCode} · {s.tenantName}
                    </AppText>{' '}
                    {s.guess
                      ? '(a guess from the typed reference)'
                      : `(${Math.round(s.confidence * 100)}% sure)`}
                  </AppText>
                  <Button
                    label="Confirm match"
                    size="sm"
                    onPress={() =>
                      setPending({
                        kind: 'assign',
                        line: u,
                        tenantId: s.tenantId,
                        unitCode: s.unitCode,
                        tenantName: s.tenantName,
                      })
                    }
                  />
                </Card>
              ))}
              <Row>
                <Button
                  label="Assign to tenant"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setQ('');
                    setAssigning(u);
                  }}
                />
                <Button
                  label="Not rent"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setNotRentChoice(null);
                    setNotRentOther('');
                    setNotRent(u);
                  }}
                />
              </Row>
            </Card>
          ))}
          {auditLog.length > 0 ? (
            <View style={{ gap: 8 }}>
              <AppText variant="strong">Decisions</AppText>
              {auditLog.slice(0, 5).map((a) => (
                <ListRow key={a.id} title={a.detail} subtitle={`${shortDay(a.at)} · ${a.action}`} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {segment === 'Cash' ? (
        <View style={{ gap: 8 }}>
          {pendingCash.length === 0 ? (
            <AppText variant="small">No cash entries waiting.</AppText>
          ) : null}
          {pendingCash.map((p) => (
            <Card key={p.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="strong">
                    {p.unitCode} · {p.tenantName}
                  </AppText>
                  <AppText variant="caption">
                    {p.recordedBy} · {receiptLabel(p.reference)}
                  </AppText>
                </View>
                <Amount minor={p.amount} prefix={false} strong />
              </View>
              <Row>
                <Button
                  label="Reject"
                  variant="secondary"
                  style={{ flex: 1 }}
                  accessibilityLabel={`Reject cash ${p.reference}`}
                  onPress={() => {
                    setCashStatus(p.id, 'rejected');
                    toast(`Rejected ${p.reference}. The caretaker is told why.`, 'warn');
                  }}
                />
                <Button
                  label="Approve"
                  style={{ flex: 1 }}
                  accessibilityLabel={`Approve cash ${p.reference}`}
                  onPress={() =>
                    setPending({
                      kind: 'approve-cash',
                      id: p.id,
                      label: `${p.unitCode} cash ${p.reference}`,
                    })
                  }
                />
              </Row>
            </Card>
          ))}
        </View>
      ) : null}

      {segment === 'Readings' ? (
        <View style={{ gap: 8 }}>
          {readings.length === 0 ? <AppText variant="small">No unusual readings.</AppText> : null}
          {readings.map((r) => (
            <Card key={r.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="strong">
                    {r.unit} · {r.property}
                  </AppText>
                  <AppText variant="caption">
                    Used {r.used} units, usual {r.usual}
                  </AppText>
                </View>
                <Badge tone="warn">Check</Badge>
              </View>
              <Row>
                <Button
                  label="Ask re-read"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    resolveReading(r.id);
                    toast(`Asked the caretaker to re-read ${r.unit}`, 'info');
                  }}
                />
                <Button
                  label="Accept"
                  style={{ flex: 1 }}
                  onPress={() => setPending({ kind: 'accept-reading', id: r.id, label: r.unit })}
                />
              </Row>
            </Card>
          ))}
        </View>
      ) : null}

      <AppText variant="caption" style={{ textAlign: 'center' }}>
        Every decision is logged and can be reversed, never deleted. Kodibox never holds the money.
      </AppText>

      <Dialog
        open={pending !== null}
        onClose={() => (scanning ? undefined : setPending(null))}
        title="Confirm with fingerprint"
        description={
          pending
            ? `Approve ${
                pending.kind === 'assign'
                  ? `${pending.line.code} for ${pending.unitCode}`
                  : pending.kind === 'not-rent'
                    ? `${pending.line.code} as not rent`
                    : pending.label
              }. This asks for your fingerprint, face unlock or 2FA code.`
            : undefined
        }
        footer={
          <>
            <Button
              label="Cancel"
              variant="ghost"
              disabled={scanning}
              onPress={() => setPending(null)}
            />
            <Button
              label={scanning ? 'Checking...' : 'Touch sensor to confirm'}
              disabled={scanning}
              onPress={confirm}
            />
          </>
        }
      >
        <AppText variant="small" accessibilityLiveRegion="polite">
          {scanning ? 'Verifying your fingerprint...' : 'Simulated in the demo.'}
        </AppText>
      </Dialog>

      <Dialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Reject claim"
        description={
          rejecting ? `Tell the tenant why ${rejecting.label} was not accepted.` : undefined
        }
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setRejecting(null)} />
            <Button
              label="Reject"
              variant="danger"
              disabled={reason.trim().length < 3}
              onPress={() => {
                if (rejecting) {
                  rejectClaim(rejecting.id, reason.trim());
                  toast('Claim rejected. The tenant sees your reason.', 'warn');
                }
                setRejecting(null);
              }}
            />
          </>
        }
      >
        <Field
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Not found in the statement"
        />
      </Dialog>

      <Dialog
        open={notRent !== null}
        onClose={() => setNotRent(null)}
        title="Mark as not rent"
        description={
          notRent
            ? `Why is ${notRent.code} not a rent payment? The reason is kept in the history.`
            : undefined
        }
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setNotRent(null)} />
            <Button
              label="Continue"
              disabled={
                notRentChoice === null ||
                (notRentChoice === 'Other' && notRentOther.trim().length < 3)
              }
              onPress={() => {
                if (notRent && notRentChoice) {
                  const reason =
                    notRentChoice === 'Other' ? `Other: ${notRentOther.trim()}` : notRentChoice;
                  setPending({ kind: 'not-rent', line: notRent, reason });
                }
                setNotRent(null);
              }}
            />
          </>
        }
      >
        <Chips
          label="Reason"
          options={NOT_RENT_REASONS}
          value={notRentChoice}
          onChange={setNotRentChoice}
        />
        {notRentChoice === 'Other' ? (
          <Field
            label="Details"
            value={notRentOther}
            onChangeText={setNotRentOther}
            placeholder="What was it for?"
          />
        ) : null}
      </Dialog>

      <Dialog
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        title="Assign to tenant"
        description={assigning ? `Pick who paid ${assigning.code}.` : undefined}
        footer={<Button label="Cancel" variant="ghost" onPress={() => setAssigning(null)} />}
      >
        <Field
          label="Search"
          value={q}
          onChangeText={setQ}
          placeholder="Name or unit"
          autoCapitalize="none"
        />
        {tenantChoices.map(({ t, code }) => (
          <ListRow
            key={t.id}
            title={t.name}
            subtitle={code}
            onPress={() => {
              if (assigning) {
                setPending({
                  kind: 'assign',
                  line: assigning,
                  tenantId: t.id,
                  unitCode: code,
                  tenantName: t.name,
                });
              }
              setAssigning(null);
            }}
          />
        ))}
      </Dialog>
    </Screen>
  );
}
