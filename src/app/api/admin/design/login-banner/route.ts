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
  const file = form.get('banner');
  if (!isFile(file)) return json({ ok: false, message: 'اختر صورة البانر أولًا' }, 400);

  const type = String(file.type || '').toLowerCase();
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/jpeg' ? 'jpg' : '';
  if (!ext) return json({ ok: false, message: 'صورة البانر يجب أن تكون PNG أو JPG أو WEBP' }, 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) return json({ ok: false, message: 'ملف الصورة فارغ' }, 400);
  if (bytes.length > 10 * 1024 * 1024) return json({ ok: false, message: 'الحد الأقصى لصورة البانر 10MB' }, 400);

  const directory = uploadsPath('design-login-banner');
  await mkdir(directory, { recursive: true });
  const filename = `login-banner-${Date.now()}.${ext}`;
  await writeFile(path.join(directory, filename), bytes);

  const designLoginBannerImageUrl = `/uploads/design-login-banner/${filename}`;
  const data = await saveAdminSettings({
    designLoginBannerImageUrl,
    designLoginBannerImageEnabled: true,
  });
  await writeAuditLog(request, 'ADMIN_UPLOAD_LOGIN_BANNER', { adminId: admin.sub }, { designLoginBannerImageUrl, size: bytes.length });
  return json({ ok: true, data, message: 'تم رفع صورة البانر بنجاح' });
}
