import { NextRequest } from 'next/server';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const search = request.nextUrl.searchParams;
  const userId = search.get('userId') || undefined;
  const take = Math.min(Number(search.get('take') || 100), 300);
  const data = await prisma.auditLog.findMany({
    where: { ...(userId ? { userId } : {}) },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      user: { select: { id: true, fullName: true, idNumber: true, cardNumber: true } },
      admin: { select: { id: true, name: true, username: true } }
    }
  });
  return json({ ok: true, data });
}
