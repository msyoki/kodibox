import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/ui';

/** Placeholder body for routes whose P task has not landed yet. The owning P task stops using it. */
export function ComingSoon({ title, task }: { title: string; task: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        title={`Coming in ${task}`}
        description="This screen is part of the clickable prototype and has not been built yet."
      />
    </>
  );
}
