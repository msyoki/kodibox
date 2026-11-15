import { PageHeader } from '@/components/page-header';
import { InvoiceList } from '@/features/invoices/components/invoice-list';
import { InvoiceRun } from '@/features/invoices/components/invoice-run';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Invoices | Kodibox' };

export default async function InvoicesPage() {
  await requireSession();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="November 2026 invoices" eyebrow="Invoice run · Step 2 of 3 · Review" />
      <InvoiceRun />
      <InvoiceList />
    </div>
  );
}
