import { NextRequest } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { uploadsPath } from '@/lib/uploads';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { safeInt } from '@/lib/security';
import { writeAuditLog } from '@/lib/audit';
import { autoFitLogo } from '@/lib/logo-fit';

export const runtime = 'nodejs';

const allowedTypes: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

type UploadedLogo = { type?: string; size?: number; arrayBuffer: () => Promise<ArrayBuffer> };

function isUploadedLogo(value: FormDataEntryValue | null): value is UploadedLogo & FormDataEntryValue {
  return !!value && typeof value === 'object' && typeof (value as UploadedLogo).arrayBuffer === 'function';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();
  if (!(await adminHasPermission(session, 'NEW_ARRIVALS'))) return json({ ok: false, message: 'ليست لديك صلاحية إدارة البانر' }, 403);
  const id = safeInt(params.id);
  if (!id) return json({ ok: false, message: 'العنصر غير موجود' }, 404);
  const item = await prisma.newArrival.findUnique({ where: { id } });
  if (!item) return json({ ok: false, message: 'العنصر غير موجود' }, 404);

  const formData = await request.formData();
  const file = formData.get('logo');
  if (!isUploadedLogo(file)) return json({ ok: false, message: 'اختار صورة اللوجو أولًا' }, 400);

  const ext = allowedTypes[String(file.type || '')];
  if (!ext) return json({ ok: false, message: 'الصورة لازم تكون PNG أو JPG أو WEBP' }, 400);
  const size = Number(file.size || 0);
  if (!size || size > 2 * 1024 * 1024) return json({ ok: false, message: 'حجم الصورة غير صالح. الحد الأقصى 2MB' }, 400);

  const dir = uploadsPath('new-arrivals');
  await mkdir(dir, { recursive: true });
  const originalBytes = Buffer.from(await file.arrayBuffer());
  // Auto-fit: trim the blank/uniform border so the logo fills and centers nicely.
  const fitted = await autoFitLogo(originalBytes);
  const finalBytes = fitted || originalBytes;
  const finalExt = fitted ? 'png' : ext;
  const filename = `${id}-${Date.now()}.${finalExt}`;
  await writeFile(path.join(dir, filename), finalBytes);

  const logoUrl = `/uploads/new-arrivals/${filename}`;
  const data = await prisma.newArrival.update({ where: { id }, data: { logoUrl } });
  await writeAuditLog(request, 'ADMIN_UPLOAD_NEW_ARRIVAL_LOGO', { adminId: session.sub }, { newArrivalId: id, logoUrl });
  return json({ ok: true, data, logoUrl });
}
