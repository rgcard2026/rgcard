import type { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { dispatchSecurityAlert } from './security-alerts';

export type AuditActor = {
  userId?: string | null;
  adminId?: string | null;
};

export function getRequestInfo(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return {
    ip: forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl?.pathname || request.url || ''
  };
}

export async function writeAuditLog(
  request: NextRequest,
  action: string,
  actor: AuditActor = {},
  metadata?: Record<string, unknown>
) {
  try {
    const info = getRequestInfo(request);
    await prisma.auditLog.create({
      data: {
        action,
        path: info.path,
        ip: info.ip,
        userAgent: info.userAgent,
        userId: actor.userId || undefined,
        adminId: actor.adminId || undefined,
        metadata: metadata ? JSON.stringify(metadata) : undefined
      }
    });
    // Alert delivery is intentionally limited to high-risk actions inside dispatchSecurityAlert.
    // It never sends card numbers, passwords, hashes, or full request bodies to the alert channel.
    await dispatchSecurityAlert(request, action, metadata);
  } catch (error) {
    console.error('audit log failed', error);
  }
}
