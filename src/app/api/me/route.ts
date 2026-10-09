import { NextRequest } from 'next/server';
import { json } from '@/lib/api';
import { getRequestSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  // Validate against the stored session (currentSessionId + expiry + account
  // state), not just the cookie signature, so logout, deactivation, lockout and
  // expiry are reflected here instead of reporting a stale logged-in state.
  const [user, admin] = await Promise.all([
    getRequestSession(request, 'user'),
    getRequestSession(request, 'admin')
  ]);
  return json({ ok: true, user, admin });
}
