import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';

export async function GET(request: NextRequest) {
  if (!(await requireApiSession(request, 'user'))) return unauthorized();
  const data = await prisma.governorate.findMany({ orderBy: { name: 'asc' } });
  return json({ ok: true, data });
}
