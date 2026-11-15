import { InvoiceDetail } from '@/features/invoices/components/invoice-detail';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Invoice | Kodibox' };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  return <InvoiceDetail id={id} />;
}
