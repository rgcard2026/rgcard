import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  const body = await request.json();
  const data = await prisma.category.update({
    where: { id: Number(params.id) },
    data: {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.icon !== undefined ? { icon: body.icon ? String(body.icon) : null } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {})
    }
  });
  return json({ ok: true, data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireApiSession(request, 'admin'))) return unauthorized();
  await prisma.category.delete({ where: { id: Number(params.id) } });
  return json({ ok: true });
}
