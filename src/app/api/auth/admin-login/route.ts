import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { badRequest, json, forbidden } from '@/lib/api';
import { cookieName, createSession, randomSessionId, sessionExpiry } from '@/lib/session';
import { getSessionMinutes } from '@/lib/settings';
import { getRequestInfo, writeAuditLog } from '@/lib/audit';
import { decryptLoginPayload } from '@/lib/loginCrypto';
import { detectSuspiciousRequest, detectSuspiciousText } from '@/lib/security';
import { firstAllowedAdminPathFromPermissions } from '@/lib/admin-auth';

async function escalateAdminLoginRate(request: NextRequest, event: string) {
  const info = getRequestInfo(request);
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const failedAttempts = await prisma.auditLog.count({ where: { action: 'ADMIN_LOGIN_FAILED', ip: info.ip, createdAt: { gte: since } } }).catch(() => 0);
  if (failedAttempts >= 5) {
    await writeAuditLog(request, 'ADMIN_BRUTE_FORCE_ALERT', {}, { severity: 'high', event, failedAttempts, windowMinutes: 15 });
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
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', {}, { severity: 'high', urlAttack, target: 'admin-login' });
    return forbidden();
  }

  let body: Record<string, string>;
  try {
    body = await readSecureBody(request);
  } catch {
    await writeAuditLog(request, 'ADMIN_LOGIN_PAYLOAD_DECRYPT_FAILED', {}, { severity: 'medium' });
    return badRequest('تعذر قراءة بيانات الدخول المشفرة');
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password) return badRequest('اسم المستخدم وكلمة المرور مطلوبين');

  const bodyAttack = detectSuspiciousText({ username });
  if (bodyAttack) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', {}, { severity: 'high', bodyAttack, target: 'admin-login' });
    return forbidden();
  }

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    await writeAuditLog(request, 'ADMIN_LOGIN_FAILED', {}, { username, reason: 'invalid_credentials' });
    await escalateAdminLoginRate(request, 'invalid_credentials');
    return json({ ok: false, message: 'بيانات الدخول غير صحيحة' }, 401);
  }

  if (!admin.isActive) {
    await writeAuditLog(request, 'ADMIN_LOGIN_FAILED', { adminId: admin.id }, { username, reason: 'admin_inactive' });
    await escalateAdminLoginRate(request, 'admin_inactive');
    return json({ ok: false, message: 'هذا الأدمن موقوف' }, 423);
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    await writeAuditLog(request, 'ADMIN_LOGIN_FAILED', { adminId: admin.id }, { username, reason: 'wrong_password' });
    await escalateAdminLoginRate(request, 'wrong_password');
    return json({ ok: false, message: 'بيانات الدخول غير صحيحة' }, 401);
  }

  const sid = randomSessionId();
  const sessionMinutes = await getSessionMinutes();
  const expiresAt = sessionExpiry(sessionMinutes);
  await prisma.admin.update({ where: { id: admin.id }, data: { currentSessionId: sid, sessionExpiresAt: expiresAt } });
  await writeAuditLog(request, 'ADMIN_LOGIN_SUCCESS', { adminId: admin.id }, { sessionExpiresAt: expiresAt.toISOString() });

  const res = NextResponse.json({ ok: true, redirectTo: firstAllowedAdminPathFromPermissions(admin.role, admin.permissions) });
  res.cookies.set(cookieName('admin'), createSession({ sub: admin.id, sid, role: 'admin', name: admin.name }, sessionMinutes), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMinutes * 60
  });
  return res;
}
