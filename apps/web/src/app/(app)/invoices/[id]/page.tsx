import { InvoiceDetail } from '@/features/invoices/components/invoice-detail';

export const metadata = { title: 'Invoice | Kodibox' };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetail id={id} />;
}
