import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const body = await request.json();
  const branchId = Number(params.id);

  const data = await prisma.$transaction(async (tx: any) => {
    const branch = await tx.branch.update({
      where: { id: branchId },
      data: {
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.address !== undefined ? { address: body.address ? String(body.address) : null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone ? String(body.phone) : null } : {}),
        ...(body.mapUrl !== undefined ? { mapUrl: body.mapUrl ? String(body.mapUrl) : null } : {}),
        ...(body.governorateId !== undefined ? { governorateId: Number(body.governorateId) } : {})
      }
    });

    if (body.governorateId !== undefined) {
      const place = await tx.place.findUnique({ where: { id: branch.placeId }, select: { governoratesConfigured: true } });
      if (place?.governoratesConfigured) {
        await tx.placeGovernorate.upsert({
          where: {
            placeId_governorateId: {
              placeId: branch.placeId,
              governorateId: branch.governorateId
            }
          },
          update: {},
          create: { placeId: branch.placeId, governorateId: branch.governorateId }
        });
      }
    }

    return branch;
  });
  return json({ ok: true, data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  await prisma.branch.delete({ where: { id: Number(params.id) } });
  return json({ ok: true });
}
