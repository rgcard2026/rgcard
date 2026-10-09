import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { badRequest, json } from '@/lib/api';
import { getRequestSession, cookieName } from '@/lib/session';
import { writeAuditLog } from '@/lib/audit';

function weakForUser(password: string, user: { fullName: string; idNumber: string; cardNumber: string }) {
  const p = password.toLowerCase();
  return password.length < 8 || p.includes(user.fullName.toLowerCase()) || p.includes(user.idNumber.toLowerCase()) || p.includes(user.cardNumber.toLowerCase());
}

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request, 'user');
  if (!session) return json({ ok: false, message: 'انتهت الجلسة' }, 401);
  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!currentPassword || !newPassword) return badRequest('كلمة المرور الحالية والجديدة مطلوبين');

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return json({ ok: false, message: 'غير موجود' }, 404);
  const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentOk) return json({ ok: false, message: 'كلمة المرور الحالية غير صحيحة' }, 401);
  if (weakForUser(newPassword, user)) return badRequest('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل ولا تحتوي على الاسم أو الرقم التعريفي أو رقم الكارت');
  if (await bcrypt.compare(newPassword, user.passwordHash)) return badRequest('كلمة المرور الجديدة لا يمكن أن تكون نفس كلمة المرور القديمة');

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false } });
  await writeAuditLog(request, 'USER_CHANGE_PASSWORD', { userId: user.id });
  return NextResponse.json({ ok: true, redirectTo: '/valid' });
}
