import { PageHeader } from '@/components/page-header';
import { InvoiceList } from '@/features/invoices/components/invoice-list';
import { InvoiceRun } from '@/features/invoices/components/invoice-run';

export const metadata = { title: 'Invoices | Kodibox' };

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="November 2026 invoices" eyebrow="Invoice run · Step 2 of 3 · Review" />
      <InvoiceRun />
      <InvoiceList />
    </div>
  );
}
