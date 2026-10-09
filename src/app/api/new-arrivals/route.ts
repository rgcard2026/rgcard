import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Public-in-app feed for the standalone New Arrival / Coming Soon banner.
 * This intentionally reads NewArrival only; places and offers are not involved.
 */
export async function GET(request: NextRequest) {
  const session = await requireApiSession(request, 'user');
  if (!session) return unauthorized();

  const currentUser = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { mustChangePassword: true, isActive: true }
  });
  if (!currentUser?.isActive) return unauthorized();
  if (currentUser.mustChangePassword) {
    return json({ ok: false, message: 'يجب تغيير كلمة المرور أولًا' }, 403);
  }

  const data = await prisma.newArrival.findMany({
    where: {
      isActive: true,
      logoUrl: { not: '' }
    },
    select: {
      id: true,
      title: true,
      logoUrl: true,
      targetUrl: true,
      sortOrder: true
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
  });

  const response = json({ ok: true, data });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return response;
}
