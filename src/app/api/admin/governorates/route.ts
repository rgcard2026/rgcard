import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';

export async function GET(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const data = await prisma.governorate.findMany({ orderBy: { name: 'asc' } });
  return json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const body = await request.json();
  if (!body.name) return badRequest('اسم المحافظة مطلوب');
  const data = await prisma.governorate.create({ data: { name: String(body.name) } });
  return json({ ok: true, data }, 201);
}
