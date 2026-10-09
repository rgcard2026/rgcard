import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiSession } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return NextResponse.json({ ok: false, message: 'غير مصرح' }, { status: 401 });
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const header = ['name','idNumber','cardNumber','membershipClass','isVip','isActive','mustChangePassword','validUntil','createdAt'];
  const rows = users.map((u) => [u.fullName, u.idNumber, u.cardNumber, u.membershipClass, u.isVip, u.isActive, u.mustChangePassword, u.validUntil?.toISOString().slice(0,10) || '', u.createdAt.toISOString()]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  await writeAuditLog(request, 'ADMIN_EXPORT_USERS_CSV', { adminId: admin.sub }, { count: users.length });
  return new NextResponse('\ufeff' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="rg-card-users.csv"' } });
}
