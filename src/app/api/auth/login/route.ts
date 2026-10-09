import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { badRequest, json, forbidden } from '@/lib/api';
import { cookieName, createSession, randomSessionId, sessionExpiry } from '@/lib/session';
import { getSessionMinutes } from '@/lib/settings';
import { getRequestInfo, writeAuditLog } from '@/lib/audit';
import { decryptLoginPayload } from '@/lib/loginCrypto';
import { detectSuspiciousRequest, detectSuspiciousText } from '@/lib/security';
import { hashLookup, encryptValue, maskCard } from '@/lib/vault';

const MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 3);
const TEMP_BLOCK_MINUTES = Number(process.env.LOGIN_TEMP_BLOCK_MINUTES || 15);
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8zQ2.SpfP5zP5Y9V3Yi5kq3c2iZ0tO'; // password: dummy-password

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function escalateFailedLoginRate(request: NextRequest, event: string) {
  const info = getRequestInfo(request);
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const failedAttempts = await prisma.auditLog.count({ where: { action: 'USER_LOGIN_FAILED', ip: info.ip, createdAt: { gte: since } } }).catch(() => 0);
  if (failedAttempts >= 5) {
    await writeAuditLog(request, 'LOGIN_RATE_ALERT', {}, { severity: 'high', event, failedAttempts, windowMinutes: 15 });
  }
}

async function readSecureBody(request: NextRequest) {
  const raw = await request.json().catch(() => ({}));
  if (raw?.payload) return decryptLoginPayload(String(raw.payload));
  return raw;
}

export async function POST(request: NextRequest) {
  const urlAttack = detectSuspiciousRequest(request);
  if (urlAttack) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', {}, { severity: 'high', urlAttack });
    return forbidden();
  }

  let body: Record<string, string>;
  try {
    body = await readSecureBody(request);
  } catch {
    await writeAuditLog(request, 'LOGIN_PAYLOAD_DECRYPT_FAILED', {}, { severity: 'medium' });
    return badRequest('تعذر قراءة بيانات الدخول المشفرة');
  }

  const idNumber = String(body.idNumber || '').trim();
  const password = String(body.password || '');
  if (!idNumber || !password) return badRequest('رقم الكارت وكلمة المرور مطلوبين');

  const bodyAttack = detectSuspiciousText({ idNumber });
  if (bodyAttack) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', {}, { severity: 'high', bodyAttack, lookupHash: hashLookup(idNumber) });
    return forbidden();
  }

  const lookupHash = hashLookup(idNumber);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { idNumberHash: lookupHash },
        { cardNumberHash: lookupHash },
        { idNumber },
        { cardNumber: idNumber }
      ]
    }
  });

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH).catch(() => null); // equalize timing a little
    await writeAuditLog(request, 'USER_LOGIN_FAILED', {}, { lookupHash, reason: 'invalid_credentials' });
    await escalateFailedLoginRate(request, 'invalid_credentials');
    return json({ ok: false, message: 'بيانات الدخول غير صحيحة' }, 401);
  }

  // Backfill encrypted lookup columns for older databases.
  if (!user.idNumberHash || !user.cardNumberHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        idNumberHash: hashLookup(user.idNumber),
        cardNumberHash: hashLookup(user.cardNumber),
        idNumberEnc: user.idNumberEnc || encryptValue(user.idNumber),
        cardNumberEnc: user.cardNumberEnc || encryptValue(user.cardNumber)
      }
    }).catch(() => null);
  }

  const now = new Date();
  if (user.validUntil && user.validUntil < now) {
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false, expiredAt: now, currentSessionId: null, sessionExpiresAt: null } });
    await writeAuditLog(request, 'USER_ACCOUNT_EXPIRED', { userId: user.id }, { lookupHash, validUntil: user.validUntil.toISOString() });
    return json({ ok: false, message: 'انتهت صلاحية الكارت. تواصل مع الإدارة لتجديد العضوية' }, 423);
  }

  if (!user.isActive || user.lockedAt) {
    await writeAuditLog(request, 'USER_LOGIN_FAILED', { userId: user.id }, { lookupHash, reason: 'account_locked_or_inactive' });
    await escalateFailedLoginRate(request, 'account_locked_or_inactive');
    return json({ ok: false, message: 'تم إيقاف الحساب، تواصل مع الإدارة' }, 423);
  }

  if (user.blockedUntil && user.blockedUntil > now) {
    await writeAuditLog(request, 'USER_LOGIN_BLOCKED', { userId: user.id }, { lookupHash, blockedUntil: user.blockedUntil.toISOString() });
    return json({ ok: false, message: `تم حظر المحاولة مؤقتًا حتى ${user.blockedUntil.toLocaleString('ar-EG')}` }, 429);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const nextAttempts = user.failedLoginAttempts + 1;

    await writeAuditLog(request, 'USER_LOGIN_FAILED', { userId: user.id }, {
      lookupHash,
      cardMasked: maskCard(user.cardNumber),
      reason: 'wrong_password',
      failedLoginAttempts: nextAttempts
    });
    await escalateFailedLoginRate(request, 'wrong_password');

    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      if (user.lockCount >= 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            lockedAt: now,
            blockedUntil: null,
            failedLoginAttempts: 0,
            lockCount: { increment: 1 },
            currentSessionId: null,
            sessionExpiresAt: null
          }
        });
        await writeAuditLog(request, 'BRUTE_FORCE_ALERT', { userId: user.id }, {
          severity: 'critical',
          event: 'account_locked_after_repeated_bruteforce',
          lookupHash,
          cardMasked: maskCard(user.cardNumber),
          failedLoginAttempts: nextAttempts
        });
        return json({ ok: false, message: 'تم قفل الحساب بسبب محاولات دخول متكررة' }, 423);
      }

      const blockedUntil = addMinutes(TEMP_BLOCK_MINUTES);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          blockedUntil,
          lockCount: { increment: 1 },
          currentSessionId: null,
          sessionExpiresAt: null
        }
      });
      await writeAuditLog(request, 'BRUTE_FORCE_ALERT', { userId: user.id }, {
        severity: 'high',
        event: 'temporary_block_after_failed_logins',
        lookupHash,
        cardMasked: maskCard(user.cardNumber),
        blockedUntil: blockedUntil.toISOString(),
        failedLoginAttempts: nextAttempts
      });
      return json({ ok: false, message: `تم حظر الحساب مؤقتًا لمدة ${TEMP_BLOCK_MINUTES} دقيقة بسبب 3 محاولات خاطئة` }, 429);
    }

    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: nextAttempts } });
    return json({ ok: false, message: `بيانات الدخول غير صحيحة. المحاولات المتبقية: ${Math.max(MAX_FAILED_ATTEMPTS - nextAttempts, 0)}` }, 401);
  }

  const sid = randomSessionId();
  const sessionMinutes = await getSessionMinutes();
  const expiresAt = sessionExpiry(sessionMinutes);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      blockedUntil: null,
      currentSessionId: sid,
      sessionExpiresAt: expiresAt
    }
  });

  await writeAuditLog(request, 'USER_LOGIN_SUCCESS', { userId: user.id }, { sessionExpiresAt: expiresAt.toISOString() });

  const res = NextResponse.json({ ok: true, redirectTo: user.mustChangePassword ? '/change-password' : '/valid' });
  res.cookies.set(cookieName('user'), createSession({ sub: user.id, sid, role: 'user', name: user.fullName, cardNumber: user.cardNumber }, sessionMinutes), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMinutes * 60
  });
  return res;
}
