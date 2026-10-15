import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forbidden, requireApiSession } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { createBulkCardsPdfBuffer } from '@/lib/card-generator';
import { getCardRenderSettings } from '@/lib/settings';
import { getRequestPublicOrigin } from '@/lib/public-url';
import { adminHasPermission } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return NextResponse.json({ ok: false, message: 'غير مصرح' }, { status: 401 });
  const canManageCards = (await adminHasPermission(admin, 'USERS')) || (await adminHasPermission(admin, 'EXPORTS'));
  if (!canManageCards) return forbidden('ليست لديك صلاحية عرض أو تصدير الكروت');

  const ids = (request.nextUrl.searchParams.get('ids') || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^[a-zA-Z0-9_-]{8,}$/.test(value))
    .slice(0, 200);
  // Specific card / ID numbers (pasted by the admin).
  const cards = (request.nextUrl.searchParams.get('cards') || '')
    .split(/[\s,;\n]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 500);
  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === '1';
  const download = request.nextUrl.searchParams.get('download') === '1';
  // Cap each PDF to a safe batch size to keep memory bounded on large accounts;
  // the UI downloads bigger sets in batches via `skip`.
  const BATCH = 500;
  const skip = (ids.length || cards.length) ? 0 : Math.max(0, Number(request.nextUrl.searchParams.get('skip') || 0));
  const where = cards.length
    ? { OR: [{ cardNumber: { in: cards } }, { idNumber: { in: cards } }] }
    : ids.length ? { id: { in: ids } } : (includeInactive ? {} : { isActive: true });
  const users = await prisma.user.findMany({
    where,
    select: { cardNumber: true, isVip: true, membershipClass: true, validUntil: true },
    orderBy: { createdAt: 'desc' },
    take: BATCH,
    skip,
  });
  const layout = await getCardRenderSettings();
  const buffer = await createBulkCardsPdfBuffer(users, layout, getRequestPublicOrigin(request));
  await writeAuditLog(request, ids.length ? 'ADMIN_EXPORT_SELECTED_CARDS_PDF' : 'ADMIN_EXPORT_ALL_CARDS_PDF', { adminId: admin.sub }, {
    count: users.length,
    selected: ids.length || null,
    includeInactive
  });
  const fileName = (ids.length || cards.length) ? 'rg-card-selected-users.pdf' : `rg-card-users-${skip + 1}-${skip + users.length}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${fileName}"`,
      'Cache-Control': 'no-store'
    }
  });
}
