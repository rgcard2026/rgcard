import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { detectSuspiciousText, safeInt, safePublicAssetUrl, safeString } from '@/lib/security';
import { writeAuditLog } from '@/lib/audit';

function parseGovernorateIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  return Array.from(new Set(value.map(Number).filter((item) => Number.isInteger(item) && item > 0)));
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const id = safeInt(params.id);
  if (!id) return json({ ok: false, message: 'غير موجود' }, 404);

  const body = await request.json() as Record<string, unknown>;
  if (detectSuspiciousText({ ...body, logoUrl: undefined, governorateIds: undefined })) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', { adminId: admin.sub }, { severity: 'high', target: 'update_place', id });
    return json({ ok: false, message: 'تم رفض الطلب لوجود مدخلات مشبوهة' }, 403);
  }

  const governorateIds = parseGovernorateIds(body.governorateIds);
  if (governorateIds) {
    const validGovernorates = await prisma.governorate.findMany({
      where: { id: { in: governorateIds } },
      select: { id: true }
    });
    if (validGovernorates.length !== governorateIds.length) return badRequest('إحدى المحافظات المحددة غير موجودة');
  }

  const data = await prisma.$transaction(async (tx: any) => {
    const placeData: any = {
      ...(body.name !== undefined ? { name: safeString(body.name) } : {}),
      ...(body.description !== undefined ? { description: body.description ? safeString(body.description, 800) : null } : {}),
      ...(body.discount !== undefined ? { discount: safeString(body.discount, 80) } : {}),
      ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl ? safePublicAssetUrl(body.logoUrl) : null } : {}),
      ...(body.categoryId !== undefined ? { categoryId: Number(body.categoryId) } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.isFeatured !== undefined ? { isFeatured: Boolean(body.isFeatured) } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) || 0 } : {}),
      ...(body.exclusiveText !== undefined ? { exclusiveText: body.exclusiveText ? safeString(body.exclusiveText, 180) : null } : {}),
      ...(governorateIds !== null ? { governoratesConfigured: true } : {})
    };

    await tx.place.update({ where: { id }, data: placeData });

    if (governorateIds !== null) {
      await tx.placeGovernorate.deleteMany({ where: { placeId: id } });
      for (const governorateId of governorateIds) {
        await tx.placeGovernorate.create({ data: { placeId: id, governorateId } });
      }
    }

    if (body.discount !== undefined || body.exclusiveText !== undefined || body.isFeatured !== undefined || body.name !== undefined) {
      await tx.offer.updateMany({
        where: { placeId: id },
        data: {
          ...(body.name !== undefined ? { title: `عرض ${safeString(body.name)}` } : {}),
          ...(body.discount !== undefined ? { discountText: safeString(body.discount, 80) } : {}),
          ...(body.exclusiveText !== undefined ? { bannerText: body.exclusiveText ? safeString(body.exclusiveText, 180) : null } : {}),
          ...(body.isFeatured !== undefined ? { isFeatured: Boolean(body.isFeatured) } : {})
        }
      });
    }

    return tx.place.findUnique({
      where: { id },
      include: {
        category: true,
        branches: { include: { governorate: true } },
        governorates: { include: { governorate: true } },
        offers: true
      }
    });
  });

  await writeAuditLog(request, 'ADMIN_UPDATE_PLACE', { adminId: admin.sub }, {
    placeId: id,
    fields: Object.keys(body),
    governorateIds
  });
  return json({ ok: true, data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const id = safeInt(params.id);
  if (!id) return json({ ok: false, message: 'غير موجود' }, 404);
  await prisma.place.delete({ where: { id } });
  await writeAuditLog(request, 'ADMIN_DELETE_PLACE', { adminId: admin.sub }, { placeId: id });
  return json({ ok: true });
}
