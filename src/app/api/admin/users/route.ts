import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { detectSuspiciousText, safeString } from '@/lib/security';
import { encryptValue, hashLookup, maskCard } from '@/lib/vault';
import { generateUniqueCardNumber } from '@/lib/card-number';
import { normalizeMembershipClass } from '@/lib/card-layout';

function prismaErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return String((error as { code?: unknown }).code || '');
}

function duplicateMessage(fields: { idNumber: boolean; cardNumber: boolean }) {
  if (fields.idNumber && fields.cardNumber) return 'الرقم التعريفي أو رقم الكارت مستخدم بالفعل';
  if (fields.idNumber) return 'الرقم التعريفي مستخدم بالفعل';
  if (fields.cardNumber) return 'رقم الكارت مستخدم بالفعل';
  return 'الرقم التعريفي أو رقم الكارت مستخدم بالفعل';
}

export async function GET(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const sp = request.nextUrl.searchParams;
  const q = sp.get('q')?.trim();
  const take = Math.min(Number(sp.get('take') || 50), 200);
  const skip = Math.max(Number(sp.get('skip') || 0), 0);
  const where = q ? {
    OR: [
      { fullName: { contains: q } },
      { idNumber: { contains: q } },
      { cardNumber: { contains: q } }
    ]
  } : {};
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true, fullName: true, idNumber: true, cardNumber: true, isActive: true, isVip: true, membershipClass: true,
        mustChangePassword: true, failedLoginAttempts: true, lockCount: true, blockedUntil: true,
        lockedAt: true, expiredAt: true, validUntil: true, currentSessionId: true, sessionExpiresAt: true,
        createdAt: true,
        customDiscounts: { include: { place: { select: { id: true, name: true, discount: true } } } },
        _count: { select: { auditLogs: true } }
      }
    }),
    prisma.user.count({ where })
  ]);
  return json({ ok: true, data, total });
}

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return badRequest('تعذر قراءة بيانات المستخدم');

  if (detectSuspiciousText({ ...body, password: undefined })) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', { adminId: admin.sub }, { target: 'create_user' });
    return json({ ok: false, message: 'تم رفض الطلب لوجود مدخلات مشبوهة' }, 403);
  }

  if (!body.fullName || !body.idNumber || !body.password) return badRequest('الاسم والرقم التعريفي وكلمة المرور مطلوبين');

  const fullName = safeString(body.fullName, 180);
  const idNumber = safeString(body.idNumber, 80);
  const cardNumber = body.cardNumber ? safeString(body.cardNumber, 80) : await generateUniqueCardNumber();
  if (!fullName || !idNumber || !cardNumber) return badRequest('بيانات المستخدم غير مكتملة');

  const validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (validUntil && Number.isNaN(validUntil.getTime())) return badRequest('تاريخ الصلاحية غير صحيح');

  const idNumberHash = hashLookup(idNumber);
  const cardNumberHash = hashLookup(cardNumber);

  try {
    // The login endpoint accepts either the ID number or card number. Prevent
    // duplicates across both columns to keep login lookup deterministic.
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { idNumber },
          { cardNumber: idNumber },
          { idNumberHash },
          { cardNumberHash: idNumberHash },
          { cardNumber },
          { idNumber: cardNumber },
          { cardNumberHash },
          { idNumberHash: cardNumberHash }
        ]
      },
      select: {
        idNumber: true,
        cardNumber: true,
        idNumberHash: true,
        cardNumberHash: true
      }
    });

    if (existing) {
      const idNumberUsed = existing.idNumber === idNumber || existing.cardNumber === idNumber || existing.idNumberHash === idNumberHash || existing.cardNumberHash === idNumberHash;
      const cardNumberUsed = existing.cardNumber === cardNumber || existing.idNumber === cardNumber || existing.cardNumberHash === cardNumberHash || existing.idNumberHash === cardNumberHash;
      return json({ ok: false, message: duplicateMessage({ idNumber: idNumberUsed, cardNumber: cardNumberUsed }) }, 409);
    }

    const membershipClass = normalizeMembershipClass(body.membershipClass, Boolean(body.isVip));
    const passwordHash = await bcrypt.hash(String(body.password), 10);
    const data = await prisma.user.create({
      data: {
        fullName,
        idNumber,
        cardNumber,
        idNumberHash,
        cardNumberHash,
        idNumberEnc: encryptValue(idNumber),
        cardNumberEnc: encryptValue(cardNumber),
        passwordHash,
        mustChangePassword: body.mustChangePassword !== false,
        isVip: membershipClass === 'VIP',
        membershipClass,
        isActive: body.isActive !== false,
        validUntil
      },
      select: { id: true, fullName: true, idNumber: true, cardNumber: true, isActive: true, isVip: true, membershipClass: true, mustChangePassword: true, validUntil: true }
    });

    await writeAuditLog(request, 'ADMIN_CREATE_USER', { adminId: admin.sub, userId: data.id }, { idHash: hashLookup(data.idNumber), cardMasked: maskCard(data.cardNumber) });
    return json({ ok: true, data }, 201);
  } catch (error) {
    const code = prismaErrorCode(error);
    console.error('ADMIN_CREATE_USER_FAILED', {
      code: code || 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error)
    });

    if (code === 'P2002') {
      return json({ ok: false, message: 'الرقم التعريفي أو رقم الكارت مستخدم بالفعل' }, 409);
    }

    return json({ ok: false, message: 'تعذر إضافة المستخدم بسبب خطأ في قاعدة البيانات' }, 500);
  }
}
