import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { adminHasPermission } from '@/lib/admin-auth';

const ALERT_ACTIONS = [
  'SECURITY_ATTACK_BLOCKED',
  'BRUTE_FORCE_ALERT',
  'ADMIN_BRUTE_FORCE_ALERT',
  'LOGIN_RATE_ALERT',
  'LOGIN_PAYLOAD_DECRYPT_FAILED',
  'ADMIN_LOGIN_PAYLOAD_DECRYPT_FAILED'
];

type ReviewMetadata = { alertId?: number };

function parseMetadata(value?: string | null): ReviewMetadata {
  try { return JSON.parse(value || '{}') as ReviewMetadata; } catch { return {}; }
}

async function requireLogsAccess() {
  const session = await getSession('admin');
  if (!session || !(await adminHasPermission(session, 'SECURITY'))) return null;
  return session;
}

export async function GET() {
  const session = await requireLogsAccess();
  if (!session) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const [alerts, reviews] = await Promise.all([
    prisma.auditLog.findMany({
      where: { action: { in: ALERT_ACTIONS } },
      select: { id: true, action: true, path: true, ip: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 150
    }),
    prisma.auditLog.findMany({
      where: { action: 'SECURITY_ALERT_REVIEWED' },
      select: { metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 300
    })
  ]);

  const reviewed = new Set(reviews.map((review) => Number(parseMetadata(review.metadata).alertId)).filter(Number.isFinite));
  return NextResponse.json({ ok: true, data: alerts.map((alert) => ({ ...alert, reviewed: reviewed.has(alert.id) })) });
}

export async function POST(request: NextRequest) {
  const session = await requireLogsAccess();
  if (!session) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const alertId = Number(body?.alertId);
  if (!Number.isInteger(alertId) || alertId <= 0) return NextResponse.json({ ok: false, message: 'Invalid alert' }, { status: 400 });

  const alert = await prisma.auditLog.findFirst({ where: { id: alertId, action: { in: ALERT_ACTIONS } }, select: { id: true } });
  if (!alert) return NextResponse.json({ ok: false, message: 'Alert not found' }, { status: 404 });

  await prisma.auditLog.create({
    data: {
      action: 'SECURITY_ALERT_REVIEWED',
      path: request.nextUrl.pathname,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: JSON.stringify({ alertId, reviewedBy: session.sub })
    }
  });

  return NextResponse.json({ ok: true });
}
