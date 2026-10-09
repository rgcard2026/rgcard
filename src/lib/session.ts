import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { prisma } from './prisma';

export type SessionRole = 'user' | 'admin';
export type SessionPayload = {
  sub: string;
  sid: string;
  role: SessionRole;
  name: string;
  cardNumber?: string;
  exp: number;
};

const USER_COOKIE = 'rg_user_session';
const ADMIN_COOKIE = 'rg_admin_session';
export const SESSION_MINUTES = Number(process.env.SESSION_MINUTES || 60);

function secret() {
  return process.env.SESSION_SECRET || process.env.AUTH_SECRET || 'dev-secret-change-me';
}

function b64(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function sign(raw: string) {
  return crypto.createHmac('sha256', secret()).update(raw).digest('base64url');
}

export function randomSessionId() {
  return crypto.randomBytes(32).toString('base64url');
}

export function sessionExpiry(minutes = SESSION_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function cookieName(role: SessionRole) {
  return role === 'admin' ? ADMIN_COOKIE : USER_COOKIE;
}

export function createSession(payload: Omit<SessionPayload, 'exp'>, minutes = SESSION_MINUTES) {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + minutes * 60
  };
  const raw = b64(JSON.stringify(body));
  return `${raw}.${sign(raw)}`;
}

export function verifySession(token?: string | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [raw, sig] = token.split('.');
  const expected = sign(raw);
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.sid || (payload.role !== 'admin' && payload.role !== 'user')) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function validateStoredSession(payload: SessionPayload | null, role: SessionRole): Promise<SessionPayload | null> {
  if (!payload || payload.role !== role) return null;
  const now = new Date();
  if (role === 'user') {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.lockedAt) return null;
    if (user.validUntil && user.validUntil < now) {
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false, expiredAt: now, currentSessionId: null, sessionExpiresAt: null } }).catch(() => null);
      return null;
    }
    if (user.currentSessionId !== payload.sid) return null;
    if (!user.sessionExpiresAt || user.sessionExpiresAt < now) return null;
    return { ...payload, name: user.fullName, cardNumber: user.cardNumber };
  }
  const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
  if (!admin || !admin.isActive) return null;
  if (admin.currentSessionId !== payload.sid) return null;
  if (!admin.sessionExpiresAt || admin.sessionExpiresAt < now) return null;
  return { ...payload, name: admin.name };
}

export async function getSession(role: SessionRole): Promise<SessionPayload | null> {
  const token = cookies().get(cookieName(role))?.value;
  return validateStoredSession(verifySession(token), role);
}

export async function getRequestSession(request: NextRequest, role: SessionRole): Promise<SessionPayload | null> {
  const token = request.cookies.get(cookieName(role))?.value;
  return validateStoredSession(verifySession(token), role);
}
