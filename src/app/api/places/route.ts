import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { safeInt } from '@/lib/security';

export async function GET(request: NextRequest) {
  const session = await requireApiSession(request, 'user');
  if (!session) return unauthorized();
  const currentUser = await prisma.user.findUnique({ where: { id: session.sub }, select: { mustChangePassword: true } });
  if (currentUser?.mustChangePassword) return json({ ok: false, message: 'يجب تغيير كلمة المرور أولًا' }, 403);

  const params = request.nextUrl.searchParams;
  const q = params.get('q')?.trim();
  const categoryId = params.get('categoryId');
  const governorateId = params.get('governorateId');
  const governorateFilterId = governorateId && safeInt(governorateId) ? Number(governorateId) : null;

  const searchWhere = q ? {
    OR: [
      { name: { contains: q } },
      { description: { contains: q } },
      { discount: { contains: q } },
      { exclusiveText: { contains: q } },
      { category: { name: { contains: q } } },
      { governorates: { some: { governorate: { name: { contains: q } } } } },
      {
        branches: {
          some: {
            OR: [
              { name: { contains: q } },
              { address: { contains: q } },
              { phone: { contains: q } },
              { mapUrl: { contains: q } },
              { governorate: { name: { contains: q } } }
            ]
          }
        }
      },
      {
        offers: {
          some: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { discountText: { contains: q } },
              { bannerText: { contains: q } }
            ]
          }
        }
      }
    ]
  } : {};

  const filters: any[] = [];
  if (q) filters.push(searchWhere);
  if (categoryId && safeInt(categoryId)) filters.push({ categoryId: Number(categoryId) });
  if (governorateFilterId) {
    filters.push({
      OR: [
        {
          governoratesConfigured: true,
          governorates: { some: { governorateId: governorateFilterId } }
        },
        {
          governoratesConfigured: false,
          branches: { some: { governorateId: governorateFilterId } }
        }
      ]
    });
  }

  const data = await prisma.place.findMany({
    where: {
      isActive: true,
      ...(filters.length ? { AND: filters } : {})
    },
    include: {
      category: true,
      branches: { include: { governorate: true } },
      governorates: { include: { governorate: true } },
      offers: { select: { id: true, title: true, description: true, discountText: true, bannerText: true, validUntil: true, isActive: true } },
      userDiscounts: { where: { userId: session.sub }, take: 1 },
      _count: { select: { branches: true } }
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }]
  });

  const mapped = data.map((place: any) => {
    const custom = place.userDiscounts[0];
    const { userDiscounts, ...rest } = place;
    return { ...rest, discount: custom?.discountText || place.discount, baseDiscount: place.discount, hasCustomDiscount: Boolean(custom) };
  });

  return json({ ok: true, data: mapped });
}
