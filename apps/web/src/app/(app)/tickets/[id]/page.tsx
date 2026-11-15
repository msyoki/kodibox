import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { TicketDetail } from '@/features/tickets/components/ticket-detail';

export const metadata = { title: 'Ticket | Kodibox' };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ticket"
        eyebrow="Complaints, repairs and billing queries from tenants"
        actions={
          <Link href="/tickets" className="font-semibold text-link underline">
            Back to tickets
          </Link>
        }
      />
      <TicketDetail ticketId={id} />
    </div>
  );
}
