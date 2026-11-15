import { notFound } from 'next/navigation';
import { getLandlord, getProperty, listUnits } from '@/demo';
import { PropertyDetail } from '@/features/properties/components/property-detail';
import { requireSession } from '@/server/session';

export const metadata = { title: 'Property | Kodibox' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const property = getProperty(id);
  if (!property) notFound();
  const landlord = getLandlord(property.landlordId);
  return (
    <PropertyDetail
      property={property}
      landlordName={landlord?.name ?? 'Unassigned'}
      units={listUnits(id)}
    />
  );
}
