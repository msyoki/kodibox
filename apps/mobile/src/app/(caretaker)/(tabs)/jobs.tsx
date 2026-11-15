import { JOB_STEPS } from '@kodibox/demo';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Field, PhotoButton } from '@/components/controls';
import { ListRow } from '@/components/list-row';
import { useToast } from '@/components/overlays';
import { AppText, Badge, Card, Section } from '@/components/primitives';
import { Screen } from '@/components/screen';
import { formatMinorPlain, parseShillings } from '@/lib/format';
import { JOBS, type Job } from '@/lib/jobs';
import { useDemo } from '@/state/demo-state';
import { useTheme } from '@/theme/theme';

export default function Jobs() {
  const { jobs } = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const job = JOBS.find((j) => j.id === openId);

  if (job) return <JobDetail key={job.id} job={job} onBack={() => setOpenId(null)} />;

  return (
    <Screen tabs title="My jobs" eyebrow="Work orders">
      <Section title="Open jobs">
        <View style={{ gap: 8 }}>
          {JOBS.map((j) => {
            const step = jobs[j.id]?.step ?? j.initialStep;
            return (
              <ListRow
                key={j.id}
                title={j.title}
                subtitle={`${j.id} · ${j.property}`}
                right={<Badge tone={step === 3 ? 'ok' : 'info'}>{JOB_STEPS[step] ?? 'Done'}</Badge>}
                onPress={() => setOpenId(j.id)}
              />
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}

function JobDetail({ job, onBack }: { job: Job; onBack: () => void }) {
  const toast = useToast();
  const { colors } = useTheme();
  const { jobs, markJobDone, queueOutbox } = useDemo();
  const state = jobs[job.id] ?? { step: job.initialStep, cost: job.initialCost };
  const jobStep = state.step;
  const [cost, setCost] = useState(
    state.cost > 0n ? formatMinorPlain(state.cost).replace(/.00$/, '') : '',
  );
  const [receipt, setReceipt] = useState(false);
  const [error, setError] = useState<string>();
  const done = jobStep === 3;

  function finish() {
    const minor = parseShillings(cost);
    if (minor === null) {
      setError('Enter the cost in whole shillings.');
      return;
    }
    if (!receipt) {
      setError('Add a photo of the receipt so the manager can approve the cost.');
      return;
    }
    setError(undefined);
    markJobDone(job.id, minor);
    queueOutbox(`Job ${job.id} marked done`);
    toast('Marked done · manager notified', 'ok');
  }

  return (
    <Screen
      tabs
      title={job.title}
      eyebrow={`Work order ${job.id} · ${job.property}`}
      right={<Button label="All jobs" variant="header" size="sm" onPress={onBack} />}
    >
      <Section title="Details">
        <Card style={{ gap: 12 }}>
          <AppText>{job.details}</AppText>
          {job.tenantPhotos > 0 ? (
            <>
              <View
                style={{ flexDirection: 'row', gap: 8 }}
                accessibilityLabel="Photos from tenant"
              >
                {Array.from({ length: job.tenantPhotos }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 64,
                      borderRadius: 12,
                      backgroundColor: colors.brandSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="caption" color={colors.link}>
                      Photo {i + 1}
                    </AppText>
                  </View>
                ))}
              </View>
              <AppText variant="caption">{job.tenantPhotos} photos from tenant</AppText>
            </>
          ) : null}
        </Card>
      </Section>

      <Section title="Status">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {JOB_STEPS.map((s, i) => (
            <View
              key={s}
              accessible
              accessibilityLabel={`${s}${i === jobStep ? ', current' : i < jobStep ? ', done' : ''}`}
              style={{ flex: 1, gap: 6 }}
            >
              <View
                style={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor:
                    i < jobStep ? colors.brand : i === jobStep ? colors.amber : colors.divider,
                }}
              />
              <AppText
                variant="caption"
                style={{ textAlign: 'center', fontWeight: i === jobStep ? '700' : '400' }}
              >
                {s}
              </AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Cost and receipt">
        <Card style={{ gap: 12 }}>
          <Field
            label="Cost (KES)"
            value={cost}
            onChangeText={setCost}
            keyboardType="number-pad"
            editable={!done}
            error={error}
          />
          <PhotoButton
            added={receipt}
            onToggle={() => setReceipt((r) => !r)}
            label="Receipt photo"
          />
          <AppText variant="caption">Cost goes to the manager as an expense for approval.</AppText>
        </Card>
      </Section>

      <Button label={done ? 'Done' : 'Mark done'} size="lg" disabled={done} onPress={finish} />
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        The manager is told and the tenant is notified (unless they opted out).
      </AppText>
    </Screen>
  );
}
