import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';

export async function GET(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const data = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  return json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const body = await request.json();
  if (!body.name) return badRequest('اسم الفئة مطلوب');
  const data = await prisma.category.create({ data: { name: String(body.name), icon: body.icon ? String(body.icon) : null, sortOrder: body.sortOrder ? Number(body.sortOrder) : 0 } });
  return json({ ok: true, data }, 201);
}
