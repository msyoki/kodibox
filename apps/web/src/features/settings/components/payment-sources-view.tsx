'use client';

import { useState } from 'react';
import { Badge, Button, Card, CardHeader, useToast } from '@/components/ui';
import { getOrganization } from '@/demo';
import { useDemoStore } from '@/demo/store';

export function PaymentSourcesView() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const org = getOrganization(data);
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState('2 Nov 2026, 06:00');

  function test() {
    setTesting(true);
    window.setTimeout(() => {
      setTesting(false);
      setLastTest('2 Nov 2026, 10:00');
      toast('Test connection OK: confirmation callback received', 'ok');
    }, 800);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="ps">
        <CardHeader title="Payment sources" id="ps" />
        <p className="mt-0 text-sm text-muted">
          Rent goes straight to your M-Pesa paybill or bank account. Kodibox only reconciles it and
          never holds the money.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-divider p-4">
          <div>
            <div className="font-semibold">M-Pesa paybill</div>
            <div className="font-mono text-lg">{org.paybill}</div>
            <div className="text-xs text-muted">Last test: {lastTest}</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="ok">Connected</Badge>
            <Button variant="secondary" disabled={testing} onClick={test}>
              {testing ? 'Testing...' : 'Test connection'}
            </Button>
          </div>
        </div>
        <p className="mt-3 mb-0 text-xs text-muted">
          Payments arrive as confirmed callbacks and are matched to tenant invoices. Unmatched ones
          wait for you in Payments; nothing is auto-deleted.
        </p>
      </Card>
    </div>
  );
}
