import { notFound, redirect } from 'next/navigation';
import PlaceDetailsClient from '@/components/PlaceDetailsClient';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function PlaceDetails({ params }: { params: { id: string } }) {
  const session = await getSession('user');
  if (!session) redirect('/login');

  const place = await prisma.place.findFirst({
    where: { id: Number(params.id), isActive: true },
    include: {
      category: true,
      offers: true,
      branches: { include: { governorate: true }, orderBy: { id: 'asc' } },
      governorates: { include: { governorate: true } },
      userDiscounts: { where: { userId: session.sub }, take: 1 }
    }
  });
  if (!place) notFound();
  const branchGovernorates = Array.from(new Map(place.branches.map((branch: any) => [branch.governorate.id, branch.governorate])).values());
  const assignedGovernorates = place.governorates.map((assignment: any) => assignment.governorate);
  const govs = place.governoratesConfigured ? assignedGovernorates : branchGovernorates;
  const customDiscount = place.userDiscounts[0];
  const effectiveDiscount = customDiscount?.discountText || place.discount;

  return (
    <PlaceDetailsClient
      cardNumber={session.cardNumber || ''}
      place={{ id: place.id, name: place.name, description: place.description, logoUrl: place.logoUrl, categoryName: place.category.name }}
      discount={effectiveDiscount}
      hasCustomDiscount={Boolean(customDiscount)}
      offers={place.offers.map((offer: any) => ({ id: offer.id, title: offer.title, description: offer.description, discountText: offer.discountText }))}
      governorates={govs.map((gov: any) => ({ id: gov.id, name: gov.name }))}
      branches={place.branches.map((branch: any) => ({ id: branch.id, name: branch.name, address: branch.address, phone: branch.phone, mapUrl: branch.mapUrl, governorate: { id: branch.governorate.id, name: branch.governorate.name } }))}
    />
  );
}
