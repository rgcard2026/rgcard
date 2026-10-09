import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { ensureStandaloneNewArrivals } from '@/lib/new-arrivals';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireApiSession(request, 'user');
  if (!session) return unauthorized();
  const currentUser = await prisma.user.findUnique({ where: { id: session.sub }, select: { mustChangePassword: true } });
  if (currentUser?.mustChangePassword) return json({ ok: false, message: 'يجب تغيير كلمة المرور أولًا' }, 403);

  await ensureStandaloneNewArrivals();
  const data = await prisma.newArrival.findMany({
    where: { isActive: true, logoUrl: { not: '' } },
    select: { id: true, title: true, logoUrl: true, targetUrl: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    take: 30
  });

  return json({ ok: true, data });
}
