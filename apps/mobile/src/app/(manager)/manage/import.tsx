import { KeyValueList } from '@/components/key-value';
import { OpenOnWeb } from '@/components/manager-ui';
import { AppText, Card, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { formatNairobiDateTime } from '@/lib/format';
import { useDemo, usePendingCounts } from '@/state/demo-state';

/** Statement imports run on the web. The phone shows what the last one did. */
export default function ImportStatement() {
  const { lastImport: s } = useDemo();
  const counts = usePendingCounts();
  return (
    <Screen title="Import statement" back="/manage/payments">
      <OpenOnWeb what="Upload your M-Pesa paybill or till statement, or a bank statement, on the Kodibox web app. Kodibox matches each line to a tenant and unit by the account reference." />
      <Section title="Last import">
        <Card style={{ gap: 8 }}>
          <KeyValueList
            rows={[
              { label: 'File', value: s.fileName, mono: true },
              { label: 'Imported', value: formatNairobiDateTime(s.at) },
              { label: 'New lines', value: String(s.newLines) },
              { label: 'Duplicates skipped', value: String(s.duplicates) },
              { label: 'Auto-matched', value: String(s.autoMatched) },
              { label: 'Needs review', value: String(counts.lines) },
              { label: 'Tenant claims confirmed', value: String(s.claimsVerified) },
              { label: 'Conflicts with verified payments', value: String(s.alerts) },
            ]}
          />
          {s.rowErrors > 0 ? (
            <AppText variant="caption">
              {s.rowErrors} row(s) could not be read and were skipped. Check them on the web app.
            </AppText>
          ) : null}
        </Card>
      </Section>
      <AppText variant="caption">
        Importing the same statement again changes nothing. Review lines that need a decision in the
        Approvals tab.
      </AppText>
    </Screen>
  );
}
