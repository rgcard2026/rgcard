import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { safeInt } from '@/lib/security';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireApiSession(request, 'user');
  if (!session) return unauthorized();
  const id = safeInt(params.id);
  if (!id) return json({ ok: false, message: 'غير موجود' }, 404);

  const data = await prisma.place.findFirst({
    where: { id, isActive: true },
    include: {
      category: true,
      offers: true,
      branches: { include: { governorate: true } },
      governorates: { include: { governorate: true } },
      userDiscounts: { where: { userId: session.sub }, take: 1 }
    }
  });
  if (!data) return json({ ok: false, message: 'غير موجود' }, 404);
  const custom = data.userDiscounts[0];
  const { userDiscounts, ...rest } = data;
  return json({ ok: true, data: { ...rest, discount: custom?.discountText || data.discount, baseDiscount: data.discount, hasCustomDiscount: Boolean(custom) } });
}
