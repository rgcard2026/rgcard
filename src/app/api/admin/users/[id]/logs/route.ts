import { NextRequest } from 'next/server';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const take = Math.min(Number(request.nextUrl.searchParams.get('take') || 30), 100);
  const data = await prisma.auditLog.findMany({
    where: { userId: params.id },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      action: true,
      path: true,
      ip: true,
      userAgent: true,
      metadata: true,
      createdAt: true
    }
  });
  return json({ ok: true, data });
}
