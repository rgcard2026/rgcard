import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { detectSuspiciousText, safeString } from '@/lib/security';
import { writeAuditLog } from '@/lib/audit';
import { ensureStandaloneNewArrivals, normalizeArrivalTargetUrl } from '@/lib/new-arrivals';

export const dynamic = 'force-dynamic';

async function requireBannerPermission(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return null;
  if (!(await adminHasPermission(session, 'NEW_ARRIVALS'))) return 'forbidden' as const;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireBannerPermission(request);
  if (!session) return unauthorized();
  if (session === 'forbidden') return json({ ok: false, message: 'ليست لديك صلاحية إدارة البانر' }, 403);

  await ensureStandaloneNewArrivals();
  const data = await prisma.newArrival.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
  });
  return json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  const session = await requireBannerPermission(request);
  if (!session) return unauthorized();
  if (session === 'forbidden') return json({ ok: false, message: 'ليست لديك صلاحية إدارة البانر' }, 403);

  const body = await request.json().catch(() => ({}));
  const title = safeString(body?.title, 120);
  const targetUrl = normalizeArrivalTargetUrl(body?.targetUrl);

  if (!title) return badRequest('اكتب اسمًا داخليًا للعنصر');
  if (!targetUrl) return badRequest('أدخل رابطًا آمنًا يبدأ بـ https:// مثل صفحة Facebook أو الموقع الرسمي');
  if (detectSuspiciousText({ title })) {
    await writeAuditLog(request, 'SECURITY_ATTACK_BLOCKED', { adminId: session.sub }, { severity: 'high', target: 'create_new_arrival' });
    return json({ ok: false, message: 'تم رفض المدخلات لوجود نص غير صالح' }, 403);
  }

  const max = await prisma.newArrival.aggregate({ _max: { sortOrder: true } });
  const data = await prisma.newArrival.create({
    data: {
      title,
      targetUrl,
      // A logo is uploaded immediately after creation from the admin screen.
      logoUrl: '',
      isActive: true,
      sortOrder: (max._max.sortOrder || 0) + 1
    }
  });

  await writeAuditLog(request, 'ADMIN_CREATE_NEW_ARRIVAL', { adminId: session.sub }, { newArrivalId: data.id });
  return json({ ok: true, data }, 201);
}
