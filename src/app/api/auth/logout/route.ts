import { NextRequest, NextResponse } from 'next/server';
import { cookieName, verifySession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const userSession = verifySession(request.cookies.get(cookieName('user'))?.value);
  const adminSession = verifySession(request.cookies.get(cookieName('admin'))?.value);

  if (userSession?.role === 'user') {
    await prisma.user.updateMany({
      where: { id: userSession.sub, currentSessionId: userSession.sid },
      data: { currentSessionId: null, sessionExpiresAt: null }
    }).catch(() => null);
    await writeAuditLog(request, 'USER_LOGOUT', { userId: userSession.sub });
  }

  if (adminSession?.role === 'admin') {
    await prisma.admin.updateMany({
      where: { id: adminSession.sub, currentSessionId: adminSession.sid },
      data: { currentSessionId: null, sessionExpiresAt: null }
    }).catch(() => null);
    await writeAuditLog(request, 'ADMIN_LOGOUT', { adminId: adminSession.sub });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName('user'), '', { path: '/', maxAge: 0 });
  res.cookies.set(cookieName('admin'), '', { path: '/', maxAge: 0 });
  return res;
}
