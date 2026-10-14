import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { NextRequest } from 'next/server';
import { uploadsPath } from '@/lib/uploads';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { saveAdminSettings } from '@/lib/settings';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && typeof (value as File).arrayBuffer === 'function');
}

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();

  const form = await request.formData();
  const file = form.get('image');
  if (!isFile(file)) return json({ ok: false, message: 'اختر صورة الرسالة المنبثقة أولًا' }, 400);

  const type = String(file.type || '').toLowerCase();
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/jpeg' ? 'jpg' : '';
  if (!ext) return json({ ok: false, message: 'الصورة يجب أن تكون PNG أو JPG أو WEBP' }, 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) return json({ ok: false, message: 'ملف الصورة فارغ' }, 400);
  if (bytes.length > 10 * 1024 * 1024) return json({ ok: false, message: 'الحد الأقصى لصورة الرسالة 10MB' }, 400);

  const directory = uploadsPath('design-popup');
  await mkdir(directory, { recursive: true });
  const filename = `popup-${Date.now()}.${ext}`;
  await writeFile(path.join(directory, filename), bytes);

  const designPopupImageUrl = `/uploads/design-popup/${filename}`;
  const data = await saveAdminSettings({
    designPopupImageUrl,
    designPopupEnabled: true,
  });
  await writeAuditLog(request, 'ADMIN_UPLOAD_POPUP_IMAGE', { adminId: admin.sub }, { designPopupImageUrl, size: bytes.length });
  return json({ ok: true, data, message: 'تم رفع صورة الرسالة بنجاح' });
}
