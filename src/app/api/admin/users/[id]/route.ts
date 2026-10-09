import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { detectSuspiciousText, safeString } from '@/lib/security';
import { encryptValue, hashLookup, maskCard } from '@/lib/vault';
import { normalizeMembershipClass } from '@/lib/card-layout';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const body = await request.json().catch(() => ({}));
  if (detectSuspiciousText({ ...body, password: undefined })) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', { adminId: admin.sub }, { target: 'update_user', userId: params.id });
    return json({ ok: false, message: 'تم رفض الطلب لوجود مدخلات مشبوهة' }, 403);
  }
  const passwordChanged = Boolean(body.password);
  const activating = body.isActive === true;
  const idNumber = body.idNumber !== undefined ? safeString(body.idNumber, 80) : undefined;
  const cardNumber = body.cardNumber !== undefined ? safeString(body.cardNumber, 80) : undefined;
  const validUntil = body.validUntil !== undefined ? (body.validUntil ? new Date(body.validUntil) : null) : undefined;
  if (validUntil instanceof Date && Number.isNaN(validUntil.getTime())) return json({ ok: false, message: 'تاريخ الصلاحية غير صالح' }, 400);
  const membershipClass = body.membershipClass !== undefined ? normalizeMembershipClass(body.membershipClass, Boolean(body.isVip)) : undefined;
  const renewing = Boolean(validUntil && validUntil > new Date());

  try {
    const hashes = [idNumber, cardNumber].filter(Boolean).map((value) => hashLookup(String(value)));
    if (hashes.length) {
      const conflict = await prisma.user.findFirst({
        where: {
          id: { not: params.id },
          OR: [
            { idNumberHash: { in: hashes } }, { cardNumberHash: { in: hashes } },
            ...(idNumber ? [{ idNumber }, { cardNumber: idNumber }] : []),
            ...(cardNumber ? [{ cardNumber }, { idNumber: cardNumber }] : [])
          ]
        },
        select: { id: true, idNumberHash: true, cardNumberHash: true }
      });
      if (conflict) return json({ ok: false, message: 'الرقم التعريفي أو رقم الكارت مستخدم بالفعل بواسطة مستخدم آخر' }, 409);
    }

    const data = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(body.fullName !== undefined ? { fullName: safeString(body.fullName, 180) } : {}),
        ...(idNumber !== undefined ? { idNumber, idNumberHash: hashLookup(idNumber), idNumberEnc: encryptValue(idNumber) } : {}),
        ...(cardNumber !== undefined ? { cardNumber, cardNumberHash: hashLookup(cardNumber), cardNumberEnc: encryptValue(cardNumber) } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(membershipClass !== undefined ? { membershipClass, isVip: membershipClass === 'VIP' } : (body.isVip !== undefined ? { isVip: Boolean(body.isVip), membershipClass: Boolean(body.isVip) ? 'VIP' : 'Regular' } : {})),
        ...(body.mustChangePassword !== undefined ? { mustChangePassword: Boolean(body.mustChangePassword) } : {}),
        ...(body.validUntil !== undefined ? { validUntil, expiredAt: renewing ? null : undefined } : {}),
        ...(passwordChanged ? { passwordHash: await bcrypt.hash(String(body.password), 10), mustChangePassword: true } : {}),
        ...(activating || passwordChanged || renewing ? { failedLoginAttempts: 0, blockedUntil: null, lockedAt: null, expiredAt: null } : {}),
        ...(passwordChanged ? { currentSessionId: null, sessionExpiresAt: null } : {})
      },
      select: { id: true, fullName: true, idNumber: true, cardNumber: true, isActive: true, isVip: true, membershipClass: true, mustChangePassword: true, validUntil: true }
    });
    await writeAuditLog(request, passwordChanged ? 'ADMIN_RESET_USER_PASSWORD' : 'ADMIN_UPDATE_USER', { adminId: admin.sub, userId: data.id }, { fields: Object.keys(body).filter((key) => key !== 'password'), cardMasked: maskCard(data.cardNumber) });
    return json({ ok: true, data, message: 'تم حفظ تعديلات المستخدم بنجاح' });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return json({ ok: false, message: 'الرقم التعريفي أو رقم الكارت مستخدم بالفعل' }, 409);
    }
    console.error('ADMIN_UPDATE_USER_FAILED', { userId: params.id, error });
    return json({ ok: false, message: 'تعذر حفظ تعديلات المستخدم. راجع البيانات وحاول مرة أخرى.' }, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  await writeAuditLog(request, 'ADMIN_DELETE_USER', { adminId: admin.sub, userId: params.id });
  await prisma.user.delete({ where: { id: params.id } });
  return json({ ok: true });
}
