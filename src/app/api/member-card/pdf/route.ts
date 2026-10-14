import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Member-card PDF generation is restricted to administrators.
 * Members can no longer download/print their card; admins issue cards through
 * the per-user route: /api/admin/users/[id]/member-card/pdf
 */
export async function GET(request: NextRequest) {
  const admin = await getRequestSession(request, 'admin');
  if (!admin) {
    await writeAuditLog(request, 'BLOCKED_MEMBER_CARD_PDF', {}).catch(() => {});
    return NextResponse.json(
      { ok: false, message: 'هذه الخدمة متاحة للمسؤولين فقط.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      message: 'استخدم صفحة الأعضاء في لوحة الإدارة لإصدار بطاقة عضو (‎/api/admin/users/[id]/member-card/pdf‎).',
    },
    { status: 400, headers: { 'Cache-Control': 'no-store' } },
  );
}
