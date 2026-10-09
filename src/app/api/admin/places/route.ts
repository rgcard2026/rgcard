import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { detectSuspiciousText, safePublicAssetUrl, safeString } from '@/lib/security';
import { writeAuditLog } from '@/lib/audit';

function requestedGovernorateIds(body: Record<string, unknown>) {
  const values = Array.isArray(body.governorateIds) ? body.governorateIds : [];
  if (body.branchName && body.governorateId) values.push(body.governorateId);
  return Array.from(new Set(values.map(Number).filter((value) => Number.isInteger(value) && value > 0)));
}

export async function GET(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const data = await prisma.place.findMany({
    include: {
      category: true,
      branches: { include: { governorate: true } },
      governorates: { include: { governorate: true } },
      offers: true,
      userDiscounts: true
    },
    orderBy: { id: 'desc' }
  });
  return json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const body = await request.json() as Record<string, unknown>;
  if (detectSuspiciousText({ ...body, logoUrl: undefined, governorateIds: undefined })) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', { adminId: admin.sub }, { severity: 'high', target: 'create_place' });
    return json({ ok: false, message: 'تم رفض الطلب لوجود مدخلات مشبوهة' }, 403);
  }
  if (!body.name || !body.discount || !body.categoryId) return badRequest('اسم المكان والخصم والفئة مطلوبين');

  const requestedIds = requestedGovernorateIds(body);
  const validGovernorates = requestedIds.length
    ? await prisma.governorate.findMany({ where: { id: { in: requestedIds } }, select: { id: true } })
    : [];
  const governorateIds = validGovernorates.map((item: { id: number }) => item.id);
  if (requestedIds.length !== governorateIds.length) return badRequest('إحدى المحافظات المحددة غير موجودة');

  const created = await prisma.place.create({
    data: {
      name: safeString(body.name),
      description: body.description ? safeString(body.description, 800) : null,
      discount: safeString(body.discount, 80),
      logoUrl: body.logoUrl ? safePublicAssetUrl(body.logoUrl) : null,
      categoryId: Number(body.categoryId),
      isActive: body.isActive !== false,
      isFeatured: Boolean(body.isFeatured),
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : 0,
      exclusiveText: body.exclusiveText ? safeString(body.exclusiveText, 180) : null,
      governoratesConfigured: Array.isArray(body.governorateIds),
      governorates: governorateIds.length ? {
        create: governorateIds.map((governorateId: number) => ({ governorateId }))
      } : undefined,
      branches: body.branchName && body.governorateId ? {
        create: {
          name: safeString(body.branchName),
          address: body.address ? safeString(body.address, 500) : null,
          phone: body.phone ? safeString(body.phone, 60) : null,
          mapUrl: body.mapUrl ? safeString(body.mapUrl, 800) : null,
          governorateId: Number(body.governorateId)
        }
      } : undefined,
      offers: {
        create: {
          title: body.offerTitle ? safeString(body.offerTitle, 180) : `عرض ${safeString(body.name)}`,
          discountText: safeString(body.discount, 80),
          description: body.description ? safeString(body.description, 800) : null,
          isFeatured: Boolean(body.isFeatured),
          bannerText: body.exclusiveText ? safeString(body.exclusiveText, 180) : null
        }
      }
    },
    include: {
      category: true,
      branches: { include: { governorate: true } },
      governorates: { include: { governorate: true } },
      offers: true
    }
  });
  await writeAuditLog(request, 'ADMIN_CREATE_PLACE', { adminId: admin.sub }, {
    placeId: created.id,
    governorateIds
  });
  return json({ ok: true, data: created }, 201);
}
