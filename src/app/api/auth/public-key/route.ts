import { NextResponse } from 'next/server';
import { LOGIN_PUBLIC_KEY } from '@/lib/loginCrypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, publicKey: LOGIN_PUBLIC_KEY }, { headers: { 'Cache-Control': 'no-store' } });
}
