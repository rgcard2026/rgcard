import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';

export async function POST(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const body = await request.json();
  if (!body.name || !body.placeId || !body.governorateId) return badRequest('اسم الفرع والمكان والمحافظة مطلوبين');

  const placeId = Number(body.placeId);
  const governorateId = Number(body.governorateId);
  const data = await prisma.$transaction(async (tx: any) => {
    const branch = await tx.branch.create({
      data: {
        name: String(body.name),
        address: body.address ? String(body.address) : null,
        phone: body.phone ? String(body.phone) : null,
        mapUrl: body.mapUrl ? String(body.mapUrl) : null,
        placeId,
        governorateId
      }
    });

    const place = await tx.place.findUnique({ where: { id: placeId }, select: { governoratesConfigured: true } });
    if (place?.governoratesConfigured) {
      await tx.placeGovernorate.upsert({
        where: { placeId_governorateId: { placeId, governorateId } },
        update: {},
        create: { placeId, governorateId }
      });
    }

    return branch;
  });
  return json({ ok: true, data }, 201);
}
