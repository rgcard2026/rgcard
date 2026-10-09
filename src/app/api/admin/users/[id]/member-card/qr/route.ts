import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiSession } from '@/lib/api';
import { generateCardQrBuffer } from '@/lib/card-generator';
import { getRequestPublicOrigin } from '@/lib/public-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return NextResponse.json({ ok: false, message: 'غير مصرح' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { cardNumber: true } });
  if (!user) return NextResponse.json({ ok: false, message: 'غير موجود' }, { status: 404 });
  const buffer = await generateCardQrBuffer(user.cardNumber, getRequestPublicOrigin(request));
  return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
}
