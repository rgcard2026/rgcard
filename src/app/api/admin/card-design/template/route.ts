import path from 'path';
import { uploadsPath } from '@/lib/uploads';
import { mkdir, writeFile } from 'fs/promises';
import { NextRequest } from 'next/server';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { getAdminSettings, saveCardTemplateUrl } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function looksLikeUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && typeof (value as File).arrayBuffer === 'function');
}

function extensionFromFile(file: File) {
  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();
  if (type.includes('png') || name.endsWith('.png')) return 'png';
  if (type.includes('jpeg') || type.includes('jpg') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg';
  return '';
}

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();

  const form = await request.formData();
  const file = form.get('template');

  if (!looksLikeUploadedFile(file)) {
    return json({ ok: false, message: 'اختار صورة تصميم الكارت الأول' }, 400);
  }

  const ext = extensionFromFile(file);
  if (!ext) {
    return json({ ok: false, message: 'تصميم الكارت لازم يكون PNG أو JPG فقط' }, 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) return json({ ok: false, message: 'ملف الصورة فارغ أو غير صالح' }, 400);
  if (bytes.length > 8 * 1024 * 1024) return json({ ok: false, message: 'حجم التصميم كبير. الحد الأقصى 8MB' }, 400);

  const uploadDir = uploadsPath('card-template');
  await mkdir(uploadDir, { recursive: true });

  const filename = `card-template-${Date.now()}.${ext}`;
  const diskPath = path.join(uploadDir, filename);
  const publicUrl = `/uploads/card-template/${filename}`;

  await writeFile(diskPath, bytes);
  const data = await saveCardTemplateUrl(publicUrl);
  await writeAuditLog(request, 'ADMIN_UPLOAD_CARD_TEMPLATE', { adminId: admin.sub }, { cardTemplateUrl: publicUrl, size: bytes.length });

  return json({ ok: true, data, message: 'تم رفع تصميم الكارت بنجاح' });
}

export async function GET(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  return json({ ok: true, data: await getAdminSettings() });
}
