import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forbidden, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit';
import { buildExportResponse, normalizeFormat, type Dataset } from '@/lib/export-formats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dateValue(value?: Date | null) {
  return value ? value.toISOString() : '';
}

function dayValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : '';
}

async function canExport(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return { session: null, response: unauthorized() };
  if (!(await adminHasPermission(session, 'EXPORTS'))) {
    return { session: null, response: forbidden('ليست لديك صلاحية التصدير') };
  }
  return { session, response: null };
}

async function buildDataset(resource: string): Promise<Dataset | null> {
  if (resource === 'users') {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return {
      name: 'rg-card-users',
      title: 'RG-Card Users',
      header: ['fullName', 'idNumber', 'cardNumber', 'membershipClass', 'isVip', 'isActive', 'mustChangePassword', 'validUntil', 'createdAt'],
      rows: users.map((user) => [user.fullName, user.idNumber, user.cardNumber, user.membershipClass, user.isVip, user.isActive, user.mustChangePassword, dayValue(user.validUntil), dateValue(user.createdAt)])
    };
  }

  if (resource === 'cards') {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return {
      name: 'rg-card-cards',
      title: 'RG-Card Cards',
      header: ['fullName', 'cardNumber', 'membershipClass', 'isVip', 'isActive', 'validUntil', 'createdAt'],
      rows: users.map((user) => [user.fullName, user.cardNumber, user.membershipClass, user.isVip, user.isActive, dayValue(user.validUntil), dateValue(user.createdAt)])
    };
  }

  if (resource === 'places') {
    const places = await prisma.place.findMany({ include: { category: true, branches: { include: { governorate: true } }, offers: true }, orderBy: { id: 'asc' } });
    return {
      name: 'rg-card-places',
      title: 'RG-Card Places',
      header: ['id', 'name', 'discount', 'description', 'category', 'isActive', 'isFeatured', 'exclusiveText', 'logoUrl', 'branches', 'offersCount', 'createdAt'],
      rows: places.map((place) => [
        place.id, place.name, place.discount, place.description || '', place.category.name, place.isActive, place.isFeatured,
        place.exclusiveText || '', place.logoUrl || '',
        place.branches.map((branch) => `${branch.name} (${branch.governorate.name})`).join(' | '),
        place.offers.length, dateValue(place.createdAt)
      ])
    };
  }

  if (resource === 'offers') {
    const offers = await prisma.offer.findMany({ include: { place: { include: { category: true } } }, orderBy: { id: 'asc' } });
    return {
      name: 'rg-card-offers',
      title: 'RG-Card Offers',
      header: ['id', 'title', 'description', 'discountText', 'place', 'category', 'validUntil', 'isActive', 'isFeatured', 'bannerText'],
      rows: offers.map((offer) => [offer.id, offer.title, offer.description || '', offer.discountText, offer.place.name, offer.place.category.name, dayValue(offer.validUntil), offer.isActive, offer.isFeatured, offer.bannerText || ''])
    };
  }

  if (resource === 'branches') {
    const branches = await prisma.branch.findMany({ include: { place: true, governorate: true }, orderBy: { id: 'asc' } });
    return {
      name: 'rg-card-branches',
      title: 'RG-Card Branches',
      header: ['id', 'place', 'branchName', 'governorate', 'address', 'phone', 'mapUrl'],
      rows: branches.map((branch) => [branch.id, branch.place.name, branch.name, branch.governorate.name, branch.address || '', branch.phone || '', branch.mapUrl || ''])
    };
  }

  if (resource === 'categories') {
    const categories = await prisma.category.findMany({ include: { _count: { select: { places: true } } }, orderBy: { sortOrder: 'asc' } });
    return {
      name: 'rg-card-categories',
      title: 'RG-Card Categories',
      header: ['id', 'name', 'icon', 'sortOrder', 'placesCount'],
      rows: categories.map((category) => [category.id, category.name, category.icon || '', category.sortOrder, category._count.places])
    };
  }

  if (resource === 'arrivals') {
    const arrivals = await prisma.newArrival.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
    return {
      name: 'rg-card-new-arrivals',
      title: 'RG-Card New Arrivals',
      header: ['id', 'title', 'logoUrl', 'targetUrl', 'isActive', 'sortOrder', 'createdAt'],
      rows: arrivals.map((arrival) => [arrival.id, arrival.title, arrival.logoUrl, arrival.targetUrl, arrival.isActive, arrival.sortOrder, dateValue(arrival.createdAt)])
    };
  }

  return null;
}

export async function GET(request: NextRequest, { params }: { params: { resource: string } }) {
  const gate = await canExport(request);
  if (!gate.session || gate.response) return gate.response as NextResponse;

  const resource = params.resource.toLowerCase();
  const adminId = gate.session.sub;
  const format = normalizeFormat(request.nextUrl.searchParams.get('format'));

  // full-data stays a single machine-readable JSON bundle of every table.
  if (resource === 'full-data') {
    const [users, places, offers, branches, categories, arrivals] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, fullName: true, idNumber: true, cardNumber: true, membershipClass: true, isVip: true, isActive: true, mustChangePassword: true, validUntil: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.place.findMany({ include: { category: true, branches: { include: { governorate: true } }, offers: true }, orderBy: { id: 'asc' } }),
      prisma.offer.findMany({ include: { place: { include: { category: true } } }, orderBy: { id: 'asc' } }),
      prisma.branch.findMany({ include: { place: true, governorate: true }, orderBy: { id: 'asc' } }),
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.newArrival.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
    ]);
    const data = { exportedAt: new Date().toISOString(), users, places, offers, branches, categories, newArrivals: arrivals };
    await writeAuditLog(request, 'ADMIN_EXPORT_FULL_DATA_JSON', { adminId }, { users: users.length, places: places.length, offers: offers.length, branches: branches.length, categories: categories.length, newArrivals: arrivals.length });
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="rg-card-full-data.json"', 'Cache-Control': 'no-store' }
    });
  }

  const dataset = await buildDataset(resource);
  if (!dataset) return NextResponse.json({ ok: false, message: 'نوع التصدير غير مدعوم' }, { status: 404 });

  await writeAuditLog(request, 'ADMIN_EXPORT', { adminId }, { resource, format, count: dataset.rows.length });
  try {
    return await buildExportResponse(dataset, format);
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'تعذر إنشاء ملف التصدير بهذه الصيغة' }, { status: 500 });
  }
}
