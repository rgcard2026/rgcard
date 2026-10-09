import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';

export async function GET(request: NextRequest) {
  if (!(await requireApiSession(request, 'user'))) return unauthorized();
  const data = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  return json({ ok: true, data });
}
