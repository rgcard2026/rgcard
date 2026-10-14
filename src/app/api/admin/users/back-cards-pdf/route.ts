import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forbidden, requireApiSession } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { createBulkBackCardsPdfBuffer } from '@/lib/card-generator';
import { getPublicSettings } from '@/lib/settings';
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
  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === '1';
  const download = request.nextUrl.searchParams.get('download') === '1';
  const where = ids.length ? { id: { in: ids } } : (includeInactive ? {} : { isActive: true });
  const users = await prisma.user.findMany({
    where,
    select: { cardNumber: true },
    orderBy: { createdAt: 'desc' }
  });
  const settings = await getPublicSettings();
  const buffer = await createBulkBackCardsPdfBuffer(users, settings.designCardBackUrl, {
    x: settings.designCardBackNumberX,
    y: settings.designCardBackNumberY,
    size: settings.designCardBackNumberSize,
    opacity: settings.designCardBackNumberOpacity,
  });
  await writeAuditLog(request, ids.length ? 'ADMIN_EXPORT_SELECTED_BACK_CARDS_PDF' : 'ADMIN_EXPORT_ALL_BACK_CARDS_PDF', { adminId: admin.sub }, {
    count: users.length,
    selected: ids.length || null,
    includeInactive
  });
  const fileName = ids.length ? 'rg-card-back-selected-users.pdf' : 'rg-card-back-all-users.pdf';
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${fileName}"`,
      'Cache-Control': 'no-store'
    }
  });
}
