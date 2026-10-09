import { NextRequest } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { uploadsPath } from '@/lib/uploads';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { safeInt } from '@/lib/security';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const allowedTypes: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

type UploadedLogo = {
  name?: string;
  type?: string;
  size?: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function isUploadedLogo(value: FormDataEntryValue | null): value is UploadedLogo & FormDataEntryValue {
  return !!value && typeof value === 'object' && typeof (value as UploadedLogo).arrayBuffer === 'function';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();

  const id = safeInt(params.id);
  if (!id) return json({ ok: false, message: 'مكان غير موجود' }, 404);

  const place = await prisma.place.findUnique({ where: { id } });
  if (!place) return json({ ok: false, message: 'مكان غير موجود' }, 404);

  const formData = await request.formData();
  const file = formData.get('logo');

  // Do not use `file && typeof file !== 'string' && typeof file.arrayBuffer === 'function'` here. In some Node/Next versions the global
  // File constructor is not available at runtime, which causes: ReferenceError: File is not defined.
  if (!isUploadedLogo(file)) {
    return json({ ok: false, message: 'اختار صورة اللوجو الأول' }, 400);
  }

  const mimeType = String(file.type || '');
  const ext = allowedTypes[mimeType];
  if (!ext) return json({ ok: false, message: 'الصورة لازم تكون PNG أو JPG أو WEBP' }, 400);

  const maxBytes = 2 * 1024 * 1024;
  const size = Number(file.size || 0);
  if (!size) return json({ ok: false, message: 'ملف الصورة فارغ أو غير صالح' }, 400);
  if (size > maxBytes) return json({ ok: false, message: 'حجم اللوجو كبير. الحد الأقصى 2MB' }, 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = uploadsPath('places');
  await mkdir(uploadDir, { recursive: true });

  const filename = `${id}-${Date.now()}.${ext}`;
  const fullPath = path.join(uploadDir, filename);
  await writeFile(fullPath, bytes);

  const logoUrl = `/uploads/places/${filename}`;
  const data = await prisma.place.update({ where: { id }, data: { logoUrl } });
  await writeAuditLog(request, 'ADMIN_UPLOAD_PLACE_LOGO', { adminId: admin.sub }, { placeId: id, logoUrl });

  return json({ ok: true, data, logoUrl });
}
