import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (newPassword.length < 8) return badRequest('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
  const admin = await prisma.admin.findUnique({ where: { id: session.sub } });
  if (!admin) return unauthorized();
  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) return json({ ok: false, message: 'كلمة المرور الحالية غير صحيحة' }, 401);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10), currentSessionId: null, sessionExpiresAt: null } });
  await writeAuditLog(request, 'ADMIN_CHANGE_PASSWORD', { adminId: admin.id });
  return json({ ok: true, message: 'تم تغيير كلمة المرور. سجل الدخول مرة أخرى' });
}
