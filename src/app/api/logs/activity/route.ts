import { NextRequest } from 'next/server';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_ACTIONS = new Set(['PAGE_VIEW', 'COPY_BLOCKED', 'PRINTSCREEN_BLOCKED', 'CONTEXT_MENU_BLOCKED', 'PRINT_BLOCKED']);

export async function POST(request: NextRequest) {
  const session = await requireApiSession(request, 'user');
  if (!session) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || 'PAGE_VIEW');
  if (!ALLOWED_ACTIONS.has(action)) return badRequest('نوع اللوج غير صالح');
  await writeAuditLog(request, action, { userId: session.sub }, { page: String(body.page || ''), details: body.details || null });
  return json({ ok: true });
}
