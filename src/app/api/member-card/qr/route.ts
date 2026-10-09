import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';
import { writeAuditLog } from '@/lib/audit';
import { generateCardQrBuffer } from '@/lib/card-generator';
import { getRequestPublicOrigin } from '@/lib/public-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request, 'user');
  if (!session) return NextResponse.json({ ok: false, message: 'غير مصرح أو انتهت الجلسة' }, { status: 401 });

  const buffer = await generateCardQrBuffer(session.cardNumber || '', getRequestPublicOrigin(request));
  await writeAuditLog(request, 'VIEW_MEMBER_CARD_QR', { userId: session.sub });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }
  });
}
