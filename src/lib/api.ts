import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestSession, type SessionRole } from './session';
import { detectSuspiciousRequest } from './security';
import { writeAuditLog } from './audit';
import { prisma } from './prisma';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function requireApiSession(request: NextRequest, role: SessionRole) {
  const session = await getRequestSession(request, role);
  if (!session) return null;

  const attackSignature = detectSuspiciousRequest(request);
  if (attackSignature) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', role === 'user' ? { userId: session.sub } : { adminId: session.sub }, {
      severity: 'critical',
      attackSignature,
      action: 'session_blocked_and_user_locked_if_member'
    });
    if (role === 'user') {
      await prisma.user.update({
        where: { id: session.sub },
        data: { isActive: false, lockedAt: new Date(), currentSessionId: null, sessionExpiresAt: null }
      }).catch(() => null);
    }
    return null;
  }

  return session;
}

export function badRequest(message: string) {
  return json({ ok: false, message }, 400);
}

export function unauthorized() {
  return json({ ok: false, message: 'غير مصرح أو انتهت الجلسة' }, 401);
}

export function forbidden(message = 'تم حظر الطلب لأسباب أمنية') {
  return json({ ok: false, message }, 403);
}
